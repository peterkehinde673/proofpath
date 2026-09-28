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
  elements.analysis.hidden = false;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showLandingView() {
  elements.analysis.hidden = true;
  elements.upload.hidden = true;
  elements.landing.hidden = false;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  elements.demoButton.focus();
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
    const id = `upload-${crypto.randomUUID()}`;
    const extension = file.name.split('.').at(-1)?.toLowerCase() || '';
    let issue = null;
    if (file.name.length > 180) issue = 'Filename is too long';
    else if (!FILE_MIME[extension]) issue = 'Unsupported format';
    else if (file.type && file.type !== FILE_MIME[extension] && file.type !== 'application/octet-stream') issue = 'File type does not match its extension';
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
        const bytes = new Uint8Array(await file.arrayBuffer());
        if (extension === 'txt') entry.text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
        else entry.base64 = encodeBytesBase64(bytes);
      } catch {
        entry.issue = 'Unreadable file';
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
  elements.selectedCount.textContent = `${count} ${count === 1 ? 'file' : 'files'} selected`;
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
  } catch {
    showError('ProofPath could not reach the local analysis service. Your selected files are still here; retry when the server is available.', 'Analysis service unavailable');
  } finally {
    elements.processing.hidden = true;
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
    if (file.sourceUrl && !issue) {
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
elements.backButton.addEventListener('click', showLandingView);
elements.retryButton.addEventListener('click', runAnalysis);
checkService();
