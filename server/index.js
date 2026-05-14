const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Serve the PWA frontend
app.use(express.static(path.join(__dirname, '../public')));

// ─── CLAUDE ───────────────────────────────────────────────────────────────────
app.post('/api/claude', async (req, res) => {
  try {
    const { question, systemPrompt } = req.body;
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1000,
        system: systemPrompt || 'You are a helpful, concise assistant. Answer clearly and factually.',
        messages: [{ role: 'user', content: question }],
      }),
    });
    const data = await response.json();
    if (data.error) return res.status(400).json({ error: data.error.message });
    const text = data.content.map(b => b.text || '').join('');
    res.json({ result: text });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── OPENAI ───────────────────────────────────────────────────────────────────
app.post('/api/openai', async (req, res) => {
  try {
    const { question } = req.body;
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 1000,
        messages: [
          { role: 'system', content: 'You are a helpful, concise assistant. Answer clearly and factually.' },
          { role: 'user', content: question },
        ],
      }),
    });
    const data = await response.json();
    if (data.error) return res.status(400).json({ error: data.error.message });
    res.json({ result: data.choices[0].message.content });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── GEMINI ───────────────────────────────────────────────────────────────────
app.post('/api/gemini', async (req, res) => {
  try {
    const { question } = req.body;
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: question }] }],
          generationConfig: { maxOutputTokens: 1000 },
        }),
      }
    );
    const data = await response.json();
    if (data.error) return res.status(400).json({ error: data.error.message });
    res.json({ result: data.candidates[0].content.parts[0].text });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── GROK ─────────────────────────────────────────────────────────────────────
app.post('/api/grok', async (req, res) => {
  try {
    const { question } = req.body;
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'grok-3-latest',
        max_tokens: 1000,
        messages: [
          { role: 'system', content: 'You are a helpful, concise assistant. Answer clearly and factually.' },
          { role: 'user', content: question },
        ],
      }),
    });
    const data = await response.json();
    if (data.error) return res.status(400).json({ error: data.error.message });
    res.json({ result: data.choices[0].message.content });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── SYNTHESIS ────────────────────────────────────────────────────────────────
app.post('/api/synthesize', async (req, res) => {
  try {
    const { question, responses } = req.body;

    const formatted = responses
      .map(r => `## ${r.model}\n${r.text}`)
      .join('\n\n---\n\n');

    const prompt = `You have received answers to the same question from multiple AI models. Synthesize them into one best answer.

ORIGINAL QUESTION: ${question}

MODEL RESPONSES:
${formatted}

Please provide:
1. **CONSENSUS ANSWER**: The best synthesized answer based on where models agree, resolving any conflicts intelligently.
2. **AGREEMENT LEVEL**: Did models largely agree, partially agree, or significantly disagree?
3. **KEY DIFFERENCES**: Note any meaningful differences (1-2 sentences max).

Be concise. The consensus answer should stand alone as a complete, useful response.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: 'You are an expert at synthesizing multiple AI responses into a single best answer. Be clear, accurate, and concise.',
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const data = await response.json();
    if (data.error) return res.status(400).json({ error: data.error.message });
    const text = data.content.map(b => b.text || '').join('');
    res.json({ result: text });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Fallback to index.html for PWA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Council running on port ${PORT}`));
