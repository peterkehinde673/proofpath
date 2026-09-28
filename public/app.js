const DEMO_FILES = [
  'seller-messages.txt',
  'payment-confirmation.txt',
  'order-confirmation.txt',
  'delivery-promise.txt',
  'follow-up.txt',
];

const state = { files: [], analysis: null, busy: false };
const elements = {
  landing: document.querySelector('#landingView'),
  analysis: document.querySelector('#analysisView'),
  demoButton: document.querySelector('#tryDemoButton'),
  uploadButton: document.querySelector('#uploadButton'),
  status: document.querySelector('#serviceStatus'),
  statusText: document.querySelector('#serviceStatusText'),
  message: document.querySelector('#messageRegion'),
  backButton: document.querySelector('#backButton'),
  processing: document.querySelector('#processingPanel'),
  error: document.querySelector('#analysisError'),
  errorTitle: document.querySelector('#errorTitle'),
  errorMessage: document.querySelector('#errorMessage'),
  retryButton: document.querySelector('#retryButton'),
  content: document.querySelector('#analysisContent'),
  summary: document.querySelector('#caseSummary'),
  fileIssues: document.querySelector('#fileIssues'),
  timeline: document.querySelector('#timeline'),
  eventCount: document.querySelector('#eventCount'),
  missing: document.querySelector('#missingList'),
  contradictions: document.querySelector('#contradictionList'),
  sources: document.querySelector('#sourceList'),
};

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
  elements.analysis.hidden = false;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showLandingView() {
  elements.analysis.hidden = true;
  elements.landing.hidden = false;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  elements.demoButton.focus();
}

async function loadDemoFiles() {
  const files = await Promise.all(DEMO_FILES.map(async (name, index) => {
    const response = await fetch(`/demo/${name}`);
    if (!response.ok) throw new Error(`The fictional demo file ${name} could not be opened.`);
    return {
      id: `demo-${index + 1}`,
      name,
      mimeType: 'text/plain',
      text: await response.text(),
    };
  }));
  state.files = files;
}

async function startDemo() {
  if (state.busy) return;
  elements.message.hidden = true;
  setBusy(true);
  showLandingMessage('Loading the fictional records and sending them for live analysis…', 'loading');
  try {
    await loadDemoFiles();
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

function showError(message, title = 'Analysis could not finish') {
  elements.processing.hidden = true;
  elements.content.hidden = true;
  elements.error.hidden = false;
  elements.errorTitle.textContent = title;
  elements.errorMessage.textContent = message;
}

async function runAnalysis() {
  if (!state.files.length || state.busy && elements.processing.hidden) return;
  setBusy(true);
  elements.processing.hidden = false;
  elements.error.hidden = true;
  elements.content.hidden = true;
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ files: state.files }),
    });
    const payload = await response.json();
    if (!response.ok) {
      const problem = payload.error || {};
      showError(problem.message || 'Please try the analysis again.', problem.code === 'AI_KEY_MISSING' ? 'Add the Gemini key to continue' : 'Analysis could not finish');
      return;
    }
    state.analysis = payload.analysis;
    renderAnalysis(payload.analysis);
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
    details.append(createElement('div', 'source-details', issue?.reason || file.text || 'Original binary file retained in memory for this analysis.'));
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
elements.backButton.addEventListener('click', showLandingView);
elements.retryButton.addEventListener('click', runAnalysis);
checkService();
