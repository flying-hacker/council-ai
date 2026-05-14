// ─── CONFIG ───────────────────────────────────────────────────────────────────

const MODELS = [
  { id: 'claude',  name: 'Claude',  company: 'Anthropic', icon: '◈', colorClass: 'claude' },
  { id: 'gpt',     name: 'ChatGPT', company: 'OpenAI',    icon: '⬡', colorClass: 'gpt'    },
  { id: 'gemini',  name: 'Gemini',  company: 'Google',    icon: '✦', colorClass: 'gemini' },
  { id: 'grok',    name: 'Grok',    company: 'xAI',       icon: '⚡', colorClass: 'grok'   },
];

const MODEL_COLORS = {
  claude: '#D4A853', gpt: '#10A37F', gemini: '#4285F4', grok: '#CCCCDD'
};

// ─── STATE ────────────────────────────────────────────────────────────────────

let state = {
  phase: 'idle',      // idle | querying | synthesizing | done
  question: '',
  keys: { gpt: '', gemini: '', grok: '' },
  results: {},        // modelId -> { text, status }
  synthesis: null,
  error: null,
  settingsOpen: false,
};

// ─── PERSISTENCE ──────────────────────────────────────────────────────────────

function loadKeys() {
  try {
    const saved = localStorage.getItem('council-keys');
    if (saved) state.keys = { ...state.keys, ...JSON.parse(saved) };
  } catch(e) {}
}

function saveKeys() {
  try {
    localStorage.setItem('council-keys', JSON.stringify(state.keys));
  } catch(e) {}
}

// ─── ACTIVE MODELS ────────────────────────────────────────────────────────────

function getActiveModels() {
  return MODELS.filter(m => m.id === 'claude' || state.keys[m.id]?.trim());
}

// ─── API CALLS ────────────────────────────────────────────────────────────────

async function callModel(modelId, question) {
  const endpoints = {
    claude:  '/api/claude',
    gpt:     '/api/openai',
    gemini:  '/api/gemini',
    grok:    '/api/grok',
  };

  const res = await fetch(endpoints[modelId], {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, apiKey: state.keys[modelId] }),
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

// ─── MAIN QUERY FLOW ──────────────────────────────────────────────────────────

async function runQuery() {
  const question = document.getElementById('questionInput').value.trim();
  if (!question) return;

  state = {
    ...state,
    phase: 'querying',
    question,
    results: {},
    synthesis: null,
    error: null,
  };

  // Init all models as 'loading'
  getActiveModels().forEach(m => {
    state.results[m.id] = { status: 'loading', text: null };
  });

  showResults();
  renderModelCards();
  updatePills();

  const activeModels = getActiveModels();
  const successfulResponses = [];

  // Fire all in parallel
  await Promise.all(activeModels.map(async (model) => {
    try {
      const text = await callModel(model.id, question);
      state.results[model.id] = { status: 'done', text };
      successfulResponses.push({ model: model.name, text });
    } catch(e) {
      state.results[model.id] = { status: 'error', text: null, errorMsg: e.message };
    }
    renderModelCards();
    updatePills();
  }));

  // Synthesize
  state.phase = 'synthesizing';
  updateSynthesisBox();

  if (successfulResponses.length === 0) {
    state.error = 'All model calls failed. Check your server is running and API keys are correct.';
    state.phase = 'done';
    updateSynthesisBox();
    return;
  }

  try {
    const synthesis = await callSynthesize(question, successfulResponses);
    state.synthesis = synthesis;
  } catch(e) {
    state.error = 'Synthesis failed: ' + e.message;
  }

  state.phase = 'done';
  updateSynthesisBox();
}

// ─── RENDER ───────────────────────────────────────────────────────────────────

function renderPills() {
  const container = document.getElementById('modelPills');
  container.innerHTML = MODELS.map(m => {
    const active = m.id === 'claude' || state.keys[m.id]?.trim();
    const result = state.results[m.id];
    const status = result?.status;

    let statusHtml = '';
    if (status === 'loading') statusHtml = `<span class="pill-status pulse" style="color:${MODEL_COLORS[m.id]}">●</span>`;
    else if (status === 'done') statusHtml = `<span class="pill-status" style="color:#4CAF50">✓</span>`;
    else if (status === 'error') statusHtml = `<span class="pill-status" style="color:#F44336">✗</span>`;

    return `<div class="pill ${active ? 'active-' + m.id : 'inactive'}">
      <span class="pill-icon" style="color:${active ? MODEL_COLORS[m.id] : '#333'}">${m.icon}</span>
      <span class="pill-name" style="color:${active ? MODEL_COLORS[m.id] : '#444'}">${m.name}</span>
      ${statusHtml}
    </div>`;
  }).join('');
}

function updatePills() { renderPills(); }

function renderModelCards() {
  const container = document.getElementById('modelCards');
  const activeModels = getActiveModels();

  container.innerHTML = activeModels.map(m => {
    const result = state.results[m.id] || {};
    const { status, text, errorMsg } = result;

    let bodyHtml = '';
    if (status === 'loading') {
      bodyHtml = `<div class="thinking">▌</div>`;
    } else if (status === 'done' && text) {
      bodyHtml = escapeHtml(text);
    } else if (status === 'error') {
      bodyHtml = `<span style="color:#F44336;font-family:monospace;font-size:11px">API error — check key</span>`;
    }

    const doneClass = status === 'done' ? `done-${m.id}` : status === 'error' ? 'errored' : '';

    return `<div class="model-card ${doneClass}">
      <div class="card-header">
        <span class="card-icon" style="color:${MODEL_COLORS[m.id]}">${m.icon}</span>
        <span class="card-name" style="color:${MODEL_COLORS[m.id]}">${m.name}</span>
        <span class="card-status">
          ${status === 'loading' ? `<span style="color:${MODEL_COLORS[m.id]};font-family:monospace;font-size:10px" class="pulse">thinking…</span>` : ''}
          ${status === 'done' ? '<span style="color:#4CAF50">✓</span>' : ''}
          ${status === 'error' ? '<span style="color:#F44336">✗</span>' : ''}
        </span>
      </div>
      <div class="card-body">${bodyHtml}</div>
    </div>`;
  }).join('');
}

function updateSynthesisBox() {
  const box = document.getElementById('consensusBox');
  if (state.phase === 'synthesizing' && !state.synthesis) {
    box.innerHTML = `<div class="synthesizing-label">◈ Synthesizing responses…</div>`;
  } else if (state.synthesis) {
    box.innerHTML = `<div class="consensus-body">${escapeHtml(state.synthesis)}</div>`;
  } else if (state.error) {
    box.innerHTML = `<div class="error-msg">${escapeHtml(state.error)}</div>`;
  }
}

function showResults() {
  document.getElementById('askSection').style.display = 'none';
  document.getElementById('resultsSection').style.display = 'block';
  document.getElementById('questionRecap').textContent = `"${state.question}"`;
  document.getElementById('consensusBox').innerHTML = `<div class="synthesizing-label">◈ Querying models…</div>`;
  document.getElementById('scrollArea').scrollTop = 0;
}

function showAsk() {
  document.getElementById('askSection').style.display = 'block';
  document.getElementById('resultsSection').style.display = 'none';
  document.getElementById('questionInput').value = '';
  document.getElementById('conveneBtn').disabled = true;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
}

// ─── SETTINGS ─────────────────────────────────────────────────────────────────

function toggleSettings() {
  state.settingsOpen = !state.settingsOpen;
  document.getElementById('settingsPanel').style.display = state.settingsOpen ? 'block' : 'none';
  document.getElementById('settingsToggle').textContent = state.settingsOpen ? '▲ CLOSE' : '⚙ KEYS';
}

function updateModelCount() {
  const n = getActiveModels().length;
  document.getElementById('modelCount').textContent = `${n} model${n !== 1 ? 's' : ''} active`;
}

// ─── INIT ─────────────────────────────────────────────────────────────────────

function init() {
  loadKeys();
  renderPills();
  updateModelCount();

  // Settings toggle
  document.getElementById('settingsToggle').addEventListener('click', toggleSettings);

  // Key inputs
  ['GPT', 'Gemini', 'Grok'].forEach(name => {
    const input = document.getElementById('key' + name);
    if (input) {
      input.value = state.keys[name.toLowerCase()] || '';
      input.addEventListener('input', () => {
        state.keys[name.toLowerCase()] = input.value;
        saveKeys();
        renderPills();
        updateModelCount();
      });
    }
  });

  // Question input
  const qInput = document.getElementById('questionInput');
  qInput.addEventListener('input', () => {
    document.getElementById('conveneBtn').disabled = !qInput.value.trim();
  });

  // Convene button
  document.getElementById('conveneBtn').addEventListener('click', runQuery);

  // New question button
  document.getElementById('newBtn').addEventListener('click', () => {
    state.results = {};
    state.phase = 'idle';
    renderPills();
    showAsk();
  });
}

// Service worker registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

document.addEventListener('DOMContentLoaded', init);
