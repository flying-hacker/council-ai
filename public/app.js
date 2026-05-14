const MODELS = [
  { id: 'claude',  name: 'Claude',  color: '#c8a84b' },
  { id: 'gpt',     name: 'ChatGPT', color: '#19a37a' },
  { id: 'gemini',  name: 'Gemini',  color: '#3d7ef5' },
  { id: 'grok',    name: 'Grok',    color: '#888888' },
];

let state = {
  phase: 'idle',
  question: '',
  keys: { gpt: '', gemini: '', grok: '' },
  results: {},
  synthesis: null,
  error: null,
  settingsOpen: false,
};

function loadKeys() {
  try {
    const saved = localStorage.getItem('council-keys');
    if (saved) state.keys = { ...state.keys, ...JSON.parse(saved) };
  } catch(e) {}
}

function saveKeys() {
  try { localStorage.setItem('council-keys', JSON.stringify(state.keys)); } catch(e) {}
}

function getActiveModels() {
  return MODELS.filter(m => m.id === 'claude' || state.keys[m.id]?.trim());
}

function renderMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/^#{1,3}\s+(.+)$/gm, '<strong>$1</strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^---+$/gm, '<hr style="border:none;border-top:0.5px solid #1c1c1c;margin:8px 0">')
    .replace(/^[\-\*]\s+(.+)$/gm, '<div style="padding-left:12px;margin:2px 0">· $1</div>')
    .replace(/\n\n/g, '<br><br>')
    .replace(/\n/g, '<br>');
}

async function callModel(modelId, question) {
  const endpoints = { claude: '/api/claude', gpt: '/api/openai', gemini: '/api/gemini', grok: '/api/grok' };
  const res = await fetch(endpoints[modelId], {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}

async function callSynthesize(question, responses) {
  const res = await fetch('/api/synthesize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, responses }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}

async function runQuery() {
  const question = document.getElementById('questionInput').value.trim();
  if (!question) return;

  state = { ...state, phase: 'querying', question, results: {}, synthesis: null, error: null };
  getActiveModels().forEach(m => { state.results[m.id] = { status: 'loading', text: null }; });

  showResults();
  renderResponses();
  updateDots();

  const activeModels = getActiveModels();
  const successfulResponses = [];

  await Promise.all(activeModels.map(async (model) => {
    try {
      const text = await callModel(model.id, question);
      state.results[model.id] = { status: 'done', text };
      successfulResponses.push({ model: model.name, text });
    } catch(e) {
      state.results[model.id] = { status: 'error', text: null };
    }
    renderResponses();
    updateDots();
  }));

  state.phase = 'synthesizing';
  updateConsensus();

  if (successfulResponses.length === 0) {
    state.error = 'All models failed — check API keys in Configure.';
    state.phase = 'done';
    updateConsensus();
    return;
  }

  try {
    state.synthesis = await callSynthesize(question, successfulResponses);
  } catch(e) {
    state.error = 'Synthesis failed: ' + e.message;
  }

  state.phase = 'done';
  updateConsensus();
}

function updateDots() {
  const container = document.getElementById('headerDots');
  if (!container) return;
  container.innerHTML = MODELS.map(m => {
    const active = m.id === 'claude' || state.keys[m.id]?.trim();
    const result = state.results[m.id];
    const status = result?.status;
    let bg = active ? m.color : '#222';
    if (status === 'done') bg = '#22aa66';
    if (status === 'error') bg = '#aa3322';
    return `<div style="width:6px;height:6px;border-radius:50%;background:${bg};transition:background 0.4s"></div>`;
  }).join('');
}

function renderResponses() {
  const container = document.getElementById('responseRows');
  if (!container) return;
  container.innerHTML = getActiveModels().map(m => {
    const { status, text } = state.results[m.id] || {};
    let body = '';
    if (status === 'loading') body = `<span style="color:#2e2e2e;font-size:11px;letter-spacing:0.05em">thinking…</span>`;
    else if (status === 'done' && text) body = renderMarkdown(text);
    else if (status === 'error') body = `<span style="color:#663333;font-size:11px">failed — check key</span>`;
    return `
      <div style="display:flex;gap:12px;margin-bottom:16px;align-items:flex-start">
        <div style="min-width:62px;display:flex;align-items:center;gap:5px;padding-top:2px;flex-shrink:0">
          <div style="width:5px;height:5px;border-radius:50%;background:${m.color};flex-shrink:0"></div>
          <span style="font-size:10px;color:${m.color};letter-spacing:0.04em;font-family:'DM Sans',sans-serif">${m.name}</span>
        </div>
        <div style="font-size:13px;color:#666;line-height:1.65;border-left:0.5px solid #1e1e1e;padding-left:12px;flex:1;font-family:'DM Sans',sans-serif">${body}</div>
      </div>`;
  }).join('');
}

function updateConsensus() {
  const box = document.getElementById('consensusBox');
  if (!box) return;
  if (state.phase === 'synthesizing') {
    box.innerHTML = `<span style="font-size:11px;color:#2a2a2a;letter-spacing:0.12em;font-family:'DM Sans',sans-serif">Synthesising…</span>`;
  } else if (state.synthesis) {
    box.innerHTML = `<div style="font-size:13px;color:#aaa;line-height:1.75;font-family:'DM Sans',sans-serif">${renderMarkdown(state.synthesis)}</div>`;
  } else if (state.error) {
    box.innerHTML = `<span style="color:#663333;font-size:12px;font-family:'DM Sans',sans-serif">${state.error}</span>`;
  }
}

function showResults() {
  document.getElementById('askSection').style.display = 'none';
  document.getElementById('resultsSection').style.display = 'block';
  document.getElementById('questionRecap').textContent = `"${state.question}"`;
  document.getElementById('consensusBox').innerHTML = `<span style="font-size:11px;color:#2a2a2a;letter-spacing:0.12em;font-family:'DM Sans',sans-serif">Querying models…</span>`;
  document.getElementById('scrollArea').scrollTop = 0;
}

function showAsk() {
  document.getElementById('askSection').style.display = 'block';
  document.getElementById('resultsSection').style.display = 'none';
  document.getElementById('questionInput').value = '';
  document.getElementById('askBtn').disabled = true;
  state.results = {};
  state.phase = 'idle';
  updateDots();
}

function toggleSettings() {
  state.settingsOpen = !state.settingsOpen;
  document.getElementById('settingsPanel').style.display = state.settingsOpen ? 'block' : 'none';
  document.getElementById('settingsToggle').textContent = state.settingsOpen ? 'Done' : 'Configure';
}

function updateModelCount() {
  const el = document.getElementById('modelCount');
  if (el) el.textContent = `${getActiveModels().length} models`;
}

function init() {
  loadKeys();
  updateDots();
  updateModelCount();

  document.getElementById('settingsToggle').addEventListener('click', toggleSettings);

  ['GPT', 'Gemini', 'Grok'].forEach(name => {
    const input = document.getElementById('key' + name);
    if (input) {
      input.value = state.keys[name.toLowerCase()] || '';
      input.addEventListener('input', () => {
        state.keys[name.toLowerCase()] = input.value.trim();
        saveKeys();
        updateDots();
        updateModelCount();
      });
    }
  });

  const qInput = document.getElementById('questionInput');
  qInput.addEventListener('input', () => {
    document.getElementById('askBtn').disabled = !qInput.value.trim();
  });

  document.getElementById('askBtn').addEventListener('click', runQuery);
  document.getElementById('newBtn').addEventListener('click', showAsk);
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => {}); });
}

document.addEventListener('DOMContentLoaded', init);
