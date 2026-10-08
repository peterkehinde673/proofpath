const DEMO_FILES = [
  'seller-messages.txt',
  'payment-confirmation.txt',
  'order-confirmation.txt',
  'delivery-promise.txt',
  'follow-up.txt',
];

const state = { files: [], analysis: null, busy: false, demoMode: false };
const elements = {
  landing: document.querySelector('#landingView'),
  upload: document.querySelector('#uploadView'),
  analysis: document.querySelector('#analysisView'),
  report: document.querySelector('#reportView'),
  demoButton: document.querySelector('#tryDemoButton'),
  uploadButton: document.querySelector('#uploadButton'),
  uploadBackButton: document.querySelector('#uploadBackButton'),
  picker: document.querySelector('#evidencePicker'),
  addFilesButton: document.querySelector('#addFilesButton'),
  chooseFilesButton: document.querySelector('#chooseFilesButton'),
  selectedCount: document.querySelector('#selectedCount'),
  emptyUpload: document.querySelector('#uploadEmpty'),
  reviewList: document.querySelector('#reviewFileList'),
  uploadNotice: document.querySelector('#uploadNotice'),
  analyzeButton: document.querySelector('#analyzeButton'),
  status: document.querySelector('#serviceStatus'),
  statusText: document.querySelector('#serviceStatusText'),
  message: document.querySelector('#messageRegion'),
  backButton: document.querySelector('#backButton'),
  processing: document.querySelector('#processingPanel'),
  error: document.querySelector('#analysisError'),
  errorTitle: document.querySelector('#errorTitle'),
  errorMessage: document.querySelector('#errorMessage'),
  retryButton: document.querySelector('#retryButton'),
  reviewFilesButton: document.querySelector('#reviewFilesButton'),
  viewReportButton: document.querySelector('#viewReportButton'),
  reportBackButton: document.querySelector('#reportBackButton'),
  reportHeading: document.querySelector('#reportHeading'),
  reportDate: document.querySelector('#reportDate'),
  reportBody: document.querySelector('#reportBody'),
  content: document.querySelector('#analysisContent'),
  summary: document.querySelector('#caseSummary'),
  fileIssues: document.querySelector('#fileIssues'),
  timeline: document.querySelector('#timeline'),
  eventCount: document.querySelector('#eventCount'),
  missing: document.querySelector('#missingList'),
  contradictions: document.querySelector('#contradictionList'),
  sources: document.querySelector('#sourceList'),
  sourceCount: document.querySelector('#sourceCount'),
  analysisEyebrow: document.querySelector('#analysisEyebrow'),
  analysisBadge: document.querySelector('#analysisBadge'),
};

const FILE_MIME = { txt: 'text/plain', pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg' };
const MAX_FILES = 5;
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_TOTAL_BYTES = 10 * 1024 * 1024;

function setServiceStatus(kind, message) {
  elements.status.className = `service-status ${kind}`;
  elements.statusText.textContent = message;
}

async function checkService() {
  try {
    const response = await fetch('/api/health');
    if (!response.ok) throw new Error('Health check failed');
    const health = await response.json();
    if (health.configured) setServiceStatus('ready', 'Live analysis ready');
    else setServiceStatus('needs-setup', 'Gemini key needed for analysis');
  } catch {
    setServiceStatus('offline', 'Local analysis service unavailable');
  }
}

function setBusy(isBusy) {
  state.busy = isBusy;
  elements.demoButton.disabled = isBusy;
  elements.uploadButton.disabled = isBusy;
  elements.analyzeButton.disabled = isBusy || !state.files.some((file) => !file.issue);
  elements.demoButton.innerHTML = isBusy
    ? '<span>Preparing demo…</span><span class="spinner small-spinner" aria-hidden="true"></span>'
    : '<span>Try Demo Packet</span><span class="button-arrow" aria-hidden="true">→</span>';
}

function showLandingMessage(message, kind = 'info', retry = false) {
  elements.message.hidden = false;
  elements.message.className = `message-region ${kind === 'loading' ? 'is-loading' : kind === 'info' ? 'is-info' : ''}`;
  elements.message.replaceChildren(document.createTextNode(message));
  if (retry) {
    const retryButton = document.createElement('button');
    retryButton.type = 'button';
    retryButton.textContent = 'Retry';
    retryButton.addEventListener('click', runAnalysis);
    elements.message.append(retryButton);
  }
}

function showAnalysisView() {
  elements.landing.hidden = true;
  elements.upload.hidden = true;
  elements.report.hidden = true;
  elements.analysis.hidden = false;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showLandingView() {
  elements.analysis.hidden = true;
  elements.upload.hidden = true;
  elements.report.hidden = true;
  elements.landing.hidden = false;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  elements.demoButton.focus();
}

function showReportView() {
  if (!state.analysis) return;
  renderReport(state.analysis);
  elements.landing.hidden = true;
  elements.upload.hidden = true;
  elements.analysis.hidden = true;
  elements.report.hidden = false;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  elements.reportHeading.focus();
}

async function loadDemoFiles() {
  const files = await Promise.all(DEMO_FILES.map(async (name, index) => {
    const response = await fetch(`/demo/${name}`);
    if (!response.ok) throw new Error(`The fictional demo file ${name} could not be opened.`);
    const text = await response.text();
    return {
      id: `demo-${index + 1}`,
      name,
      mimeType: 'text/plain',
      size: new Blob([text]).size,
      text,
      sourceUrl: `/demo/${name}`,
    };
  }));
  state.files = files;
}

async function startDemo() {
  if (state.busy) return;
  clearSelectedFiles();
  elements.message.hidden = true;
  setBusy(true);
  showLandingMessage('Loading the fictional records and sending them for live analysis…', 'loading');
  try {
    await loadDemoFiles();
    state.demoMode = true;
    updateAnalysisContext();
    showAnalysisView();
    elements.processing.hidden = false;
    elements.error.hidden = true;
    elements.content.hidden = true;
    await runAnalysis();
  } catch (error) {
    setBusy(false);
    showLandingMessage(error.message || 'The demo packet could not be loaded. Please retry.', 'error', true);
  }
}

function showUploadView() {
  elements.landing.hidden = true;
  elements.analysis.hidden = true;
  elements.upload.hidden = false;
  elements.uploadNotice.hidden = true;
  renderReviewFiles();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (!state.files.length) elements.chooseFilesButton.focus();
}

function clearSelectedFiles() {
  for (const file of state.files) {
    if (file.sourceUrl?.startsWith('blob:')) URL.revokeObjectURL(file.sourceUrl);
  }
  state.files = [];
}

function beginUploadSelection() {
  clearSelectedFiles();
  state.demoMode = false;
  elements.picker.click();
}

function humanBytes(bytes) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function encodeBytesBase64(bytes) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

async function readTextFile(file) {
  const failures = [];

  try {
    if (typeof file.arrayBuffer === 'function') {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      return { text, method: 'arrayBuffer' };
    }
  } catch (error) {
    failures.push(error?.message || error?.name || 'arrayBuffer failed');
  }

  try {
    if (typeof file.text === 'function') {
      const text = await file.text();
      if (text || file.size === 0) return { text, method: 'blob.text' };
      failures.push('Blob.text returned empty content');
    }
  } catch (error) {
    failures.push(error?.message || error?.name || 'Blob.text failed');
  }

  try {
    const result = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
      reader.onerror = () => reject(reader.error || new Error('FileReader failed'));
      reader.readAsText(file, 'UTF-8');
    });
    if (result || file.size === 0) return { text: result, method: 'FileReader' };
    failures.push('FileReader returned empty content');
  } catch (error) {
    failures.push(error?.message || error?.name || 'FileReader failed');
  }

  throw new Error('Could not read ' + file.name + ' (' + file.size + ' bytes): ' + (failures.join('; ') || 'unknown read error'));
}

async function acceptSelectedFiles(fileList) {
  const incoming = [...fileList];
  elements.uploadNotice.hidden = true;
  if (state.files.length >= MAX_FILES) {
    setUploadNotice(`ProofPath supports up to ${MAX_FILES} files. Remove one before adding another.`);
    elements.picker.value = '';
    return;
  }
  const available = MAX_FILES - state.files.length;
  const selected = incoming.slice(0, available);
  const notices = [];
  if (incoming.length > available) notices.push(`Only ${available} more file${available === 1 ? '' : 's'} fit the ${MAX_FILES}-file limit.`);

  let total = state.files.reduce((sum, file) => sum + file.size, 0);
  for (const file of selected) {
    const id = `upload-${crypto.randomUUID().replaceAll('-', '').slice(0, 32)}`;
    const extension = file.name.split('.').at(-1)?.toLowerCase() || '';
    let issue = null;
    if (file.name.length > 180) issue = 'Filename is too long';
    else if (!FILE_MIME[extension]) issue = 'Unsupported format';
    else if (extension !== 'txt' && file.type && file.type !== FILE_MIME[extension] && file.type !== 'application/octet-stream') issue = 'File type does not match its extension';
    else if (file.size > MAX_FILE_BYTES) issue = 'File exceeds the 2 MB per-file limit';
    else if (total + file.size > MAX_TOTAL_BYTES) issue = 'File exceeds the 10 MB total selection limit';

    const entry = {
      id,
      name: file.name,
      mimeType: FILE_MIME[extension] || file.type || 'application/octet-stream',
      size: file.size,
      issue,
      sourceUrl: URL.createObjectURL(file),
    };
    if (!issue) {
      try {
        if (extension === 'txt') {
          const result = await readTextFile(file);
          entry.text = result.text;
          entry.readMethod = result.method;
          if (!entry.text.trim() && file.size > 0) throw new Error('Text file was empty or unreadable');
        } else {
          const bytes = new Uint8Array(await file.arrayBuffer());
          entry.base64 = encodeBytesBase64(bytes);
        }
      } catch (error) {
        entry.issue = error?.message || 'Unreadable file';
      }
    }
    state.files.push(entry);
    total += file.size;
  }
  if (notices.length) setUploadNotice(notices.join(' '));
  renderReviewFiles();
  elements.picker.value = '';
}

function setUploadNotice(message) {
  elements.uploadNotice.hidden = false;
  elements.uploadNotice.textContent = message;
}

function renderReviewFiles() {
  const count = state.files.length;
  if (!count) elements.uploadNotice.hidden = true;
  const readableCount = state.files.filter((file) => !file.issue).length;
  elements.selectedCount.textContent = count
    ? `${readableCount} of ${count} ${count === 1 ? 'file' : 'files'} ready`
    : '0 files selected';
  elements.emptyUpload.hidden = count > 0;
  elements.reviewList.replaceChildren();
  for (const file of state.files) {
    const row = document.createElement('li');
    row.className = `review-file${file.issue ? ' has-issue' : ''}`;
    const badge = createElement('span', 'review-file-type', file.name.split('.').at(-1)?.toUpperCase() || 'FILE');
    badge.setAttribute('aria-hidden', 'true');
    const info = createElement('div', 'review-file-info');
    info.append(createElement('strong', '', file.name));
    const meta = `${file.mimeType || 'Unknown type'} · ${humanBytes(file.size)}${file.issue ? ` · ${file.issue}` : ''}`;
    info.append(createElement('small', '', meta));
    const remove = createElement('button', 'remove-file-button', 'Remove');
    remove.type = 'button';
    remove.setAttribute('aria-label', `Remove ${file.name}`);
    remove.addEventListener('click', () => {
      URL.revokeObjectURL(file.sourceUrl);
      state.files = state.files.filter((item) => item.id !== file.id);
      renderReviewFiles();
    });
    row.append(badge, info, remove);
    elements.reviewList.append(row);
  }
  elements.analyzeButton.disabled = state.busy || !state.files.length || !state.files.some((file) => !file.issue);
  elements.addFilesButton.disabled = count >= MAX_FILES || state.busy;
  elements.chooseFilesButton.disabled = count >= MAX_FILES || state.busy;
  if (count && !state.files.some((file) => !file.issue)) {
    setUploadNotice('No readable files are ready to analyze. Remove or replace the affected file, then try again.');
  }
}

function updateAnalysisContext() {
  elements.analysisEyebrow.textContent = state.demoMode ? 'Fictional online purchase · Evidence review' : 'Uploaded records · Evidence review';
  elements.analysisBadge.lastChild.textContent = state.demoMode ? ' Synthetic demo' : ' Your evidence';
  elements.sourceCount.textContent = `${state.files.length} ${state.files.length === 1 ? 'file' : 'files'}`;
}

function showError(message, title = 'Analysis could not finish') {
  elements.processing.hidden = true;
  elements.content.hidden = true;
  elements.error.hidden = false;
  elements.errorTitle.textContent = title;
  elements.errorMessage.textContent = message;
}

async function runAnalysis() {
  const readableFiles = state.files.filter((file) => !file.issue);
  if (!readableFiles.length || state.busy && elements.processing.hidden) return;
  setBusy(true);
  elements.processing.hidden = false;
  elements.processing.setAttribute('aria-busy', 'true');
  elements.error.hidden = true;
  elements.content.hidden = true;
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ files: readableFiles.map(({ id, name, mimeType, text, base64 }) => ({ id, name, mimeType, text, base64 })) }),
    });
    const payload = await response.json();
    if (!response.ok) {
      const problem = payload.error || {};
      showError(problem.message || 'Please try the analysis again.', problem.code === 'AI_KEY_MISSING' ? 'Add the Gemini key to continue' : 'Analysis could not finish');
      return;
    }
    const localIssues = state.files.filter((file) => file.issue).map((file) => ({ fileId: file.id, name: file.name, reason: file.issue }));
    state.analysis = { ...payload.analysis, fileIssues: [...(payload.analysis.fileIssues || []), ...localIssues] };
    updateAnalysisContext();
    renderAnalysis(state.analysis);
    elements.analysis.querySelector('#analysisTitle')?.focus();
  } catch {
    showError('ProofPath could not reach the local analysis service. Your selected files are still here; retry when the server is available.', 'Analysis service unavailable');
  } finally {
    elements.processing.hidden = true;
    elements.processing.setAttribute('aria-busy', 'false');
    setBusy(false);
  }
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function sourceMap() {
  return new Map(state.files.map((file) => [file.id, file]));
}

function renderEvent(event, filesById) {
  const card = createElement('article', 'event-card');
  card.setAttribute('aria-label', `${event.event}, ${event.status}`);
  const pin = createElement('span', `event-pin ${event.status}`);
  pin.setAttribute('aria-hidden', 'true');
  card.append(pin);

  const meta = createElement('div', 'event-meta');
  const date = createElement('time', 'event-date', event.date || 'Date not stated');
  if (event.date) date.dateTime = event.date;
  const status = createElement('span', `status-pill ${event.status}`, event.status[0].toUpperCase() + event.status.slice(1));
  meta.append(date, status);
  card.append(meta);
  card.append(createElement('h3', '', event.event));
  card.append(createElement('p', 'event-why', event.why));

  if (event.evidence?.length) {
    const evidenceList = createElement('div', 'event-evidence');
    for (const source of event.evidence) {
      const file = filesById.get(source.fileId);
      if (!file) continue;
      const item = createElement('div', 'event-source');
      item.append(createElement('strong', '', file.name));
      item.append(createElement('blockquote', '', `“${source.excerpt}”`));
      item.append(createElement('small', '', source.detail));
      evidenceList.append(item);
    }
    card.append(evidenceList);
  }
  return card;
}

function renderMissing(items) {
  elements.missing.replaceChildren();
  if (!items.length) {
    elements.missing.append(createElement('p', 'empty-aside', 'No additional evidence gap was identified in this set.'));
    return;
  }
  for (const item of items) {
    const row = createElement('div', 'missing-item');
    row.append(createElement('strong', '', item.event));
    row.append(createElement('p', '', item.needed));
    elements.missing.append(row);
  }
}

function renderContradictions(items, filesById) {
  elements.contradictions.replaceChildren();
  if (!items.length) {
    elements.contradictions.append(createElement('p', 'empty-aside', 'No contradiction was detected in the submitted files.'));
    return;
  }
  for (const item of items) {
    const row = createElement('div', 'contradiction-item');
    row.append(createElement('strong', '', item.claim));
    row.append(createElement('p', '', item.explanation));
    const sources = createElement('div', 'contradiction-sources');
    for (const source of item.evidence || []) {
      const file = filesById.get(source.fileId);
      if (file) sources.append(createElement('span', '', file.name));
    }
    row.append(sources);
    elements.contradictions.append(row);
  }
}

function renderSources(files, fileIssues = []) {
  elements.sources.replaceChildren();
  const issues = new Map(fileIssues.map((issue) => [issue.fileId, issue]));
  for (const file of files) {
    const details = document.createElement('details');
    details.className = 'source-item';
    const summary = document.createElement('summary');
    const icon = createElement('span', 'source-file-icon', file.name.split('.').at(-1));
    icon.setAttribute('aria-hidden', 'true');
    summary.append(icon, createElement('span', 'source-file-name', issues.has(file.id) ? `${file.name} · unavailable` : file.name));
    details.append(summary);
    const issue = issues.get(file.id);
    const detailsContent = document.createElement('div');
    detailsContent.className = 'source-details';
    detailsContent.append(createElement('p', '', issue?.reason || file.text || 'Original file retained in this browser session.'));
    if (file.sourceUrl) {
      const openOriginal = createElement('a', '', 'Open original file');
      openOriginal.href = file.sourceUrl;
      openOriginal.target = '_blank';
      openOriginal.rel = 'noopener noreferrer';
      openOriginal.setAttribute('aria-label', `Open original file ${file.name} in a new tab`);
      detailsContent.append(openOriginal);
    }
    details.append(detailsContent);
    elements.sources.append(details);
  }
}

function renderAnalysis(analysis) {
  const filesById = sourceMap();
  elements.summary.textContent = analysis.summary;
  elements.timeline.replaceChildren();
  const events = [...analysis.events].sort((left, right) => {
    if (!left.date && !right.date) return 0;
    if (!left.date) return 1;
    if (!right.date) return -1;
    return left.date.localeCompare(right.date);
  });
  elements.eventCount.textContent = `${events.length} ${events.length === 1 ? 'event' : 'events'}`;
  for (const event of events) elements.timeline.append(renderEvent(event, filesById));
  renderMissing(analysis.missingEvidence || []);
  renderContradictions(analysis.contradictions || [], filesById);
  renderSources(state.files, analysis.fileIssues || []);

  elements.fileIssues.hidden = !(analysis.fileIssues || []).length;
  elements.fileIssues.replaceChildren();
  for (const issue of analysis.fileIssues || []) {
    elements.fileIssues.append(createElement('div', '', `${issue.name || 'A file'}: ${issue.reason}`));
  }
  elements.error.hidden = true;
  elements.content.hidden = false;
}

function reportSection(title, className = '') {
  const section = createElement('section', `report-section${className ? ` ${className}` : ''}`);
  section.append(createElement('h2', '', title));
  return section;
}

function renderReport(analysis) {
  const filesById = sourceMap();
  elements.reportBody.replaceChildren();
  elements.reportDate.textContent = `Prepared ${new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date())}`;

  const overview = reportSection('Case summary');
  overview.append(createElement('p', '', analysis.summary));
  elements.reportBody.append(overview);

  const timeline = reportSection('Chronological evidence');
  const events = [...analysis.events].sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'));
  if (!events.length) timeline.append(createElement('p', 'report-muted', 'No events could be established from the readable files.'));
  for (const event of events) {
    const item = createElement('article', 'report-event');
    const top = createElement('div', 'report-event-top');
    top.append(createElement('span', 'report-event-date', event.date || 'Date not stated'));
    top.append(createElement('span', `status-pill ${event.status}`, event.status[0].toUpperCase() + event.status.slice(1)));
    item.append(top, createElement('h3', '', event.event), createElement('p', '', event.why));
    for (const source of event.evidence || []) {
      const file = filesById.get(source.fileId);
      if (!file) continue;
      const evidence = createElement('div', 'report-source');
      evidence.append(createElement('strong', '', file.name));
      evidence.append(createElement('blockquote', '', `“${source.excerpt}”`));
      evidence.append(createElement('p', '', source.detail));
      item.append(evidence);
    }
    timeline.append(item);
  }
  elements.reportBody.append(timeline);

  const gaps = reportSection('Missing evidence');
  if (!analysis.missingEvidence.length) gaps.append(createElement('p', 'report-muted', 'No additional missing evidence was identified in this set.'));
  for (const gap of analysis.missingEvidence) {
    const item = createElement('div', 'report-gap');
    item.append(createElement('strong', '', gap.event), createElement('p', '', gap.needed));
    gaps.append(item);
  }
  elements.reportBody.append(gaps);

  const contradictions = reportSection('Contradictions');
  if (!analysis.contradictions.length) contradictions.append(createElement('p', 'report-muted', 'No contradiction was detected in the submitted files.'));
  for (const conflict of analysis.contradictions) {
    const item = createElement('div', 'report-gap');
    item.append(createElement('strong', '', conflict.claim), createElement('p', '', conflict.explanation));
    const sources = createElement('p', 'report-muted', (conflict.evidence || []).map((source) => filesById.get(source.fileId)?.name).filter(Boolean).join(' · '));
    item.append(sources);
    contradictions.append(item);
  }
  elements.reportBody.append(contradictions);
}

elements.demoButton.addEventListener('click', startDemo);
elements.uploadButton.addEventListener('click', beginUploadSelection);
elements.addFilesButton.addEventListener('click', () => elements.picker.click());
elements.chooseFilesButton.addEventListener('click', () => elements.picker.click());
elements.picker.addEventListener('change', async (event) => {
  state.demoMode = false;
  await acceptSelectedFiles(event.target.files);
  showUploadView();
});
elements.uploadBackButton.addEventListener('click', showLandingView);
elements.analyzeButton.addEventListener('click', () => {
  state.demoMode = false;
  updateAnalysisContext();
  showAnalysisView();
  elements.processing.hidden = false;
  elements.error.hidden = true;
  elements.content.hidden = true;
  runAnalysis();
});
elements.reviewFilesButton.addEventListener('click', showUploadView);
elements.viewReportButton.addEventListener('click', showReportView);
elements.reportBackButton.addEventListener('click', showAnalysisView);
elements.backButton.addEventListener('click', showLandingView);
elements.retryButton.addEventListener('click', runAnalysis);
checkService();
