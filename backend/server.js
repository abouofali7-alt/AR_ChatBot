const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const ai = require('./src/ai');
const channels = require('./src/channels');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json({ limit: '5mb' }));

const WEB_BUILD = path.join(__dirname, '..', 'app', 'build', 'web');
const WIDGET_DIR = path.join(__dirname, '..', 'widget');
if (fs.existsSync(WEB_BUILD)) {
  app.use(express.static(WEB_BUILD));
}
if (fs.existsSync(WIDGET_DIR)) {
  app.use('/widget', express.static(WIDGET_DIR));
}

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function loadJSON(file, fallback = {}) {
  const p = path.join(DATA_DIR, file);
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fallback; }
}
function saveJSON(file, data) {
  fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2), 'utf8');
}

if (!fs.existsSync(path.join(DATA_DIR, 'config.json')) || !loadJSON('config.json').apiKey) {
  const envConfig = {
    apiKey: process.env.AR_CHATBOT_KEY || 'ar_chatbot_2026',
    companyName: process.env.COMPANY_NAME || 'AR_ChatBot',
    personality: 'Friendly and professional',
    customInstructions: '',
    defaultLanguage: 'ar',
    aiProvider: 'groq',
    aiModel: 'allam-2-7b',
    groqApiKey: process.env.GROQ_API_KEY || '',
    openaiApiKey: '',
    temperature: 0.7,
    businessHours: { enabled: false, startHour: 9, endHour: 17, timezone: 'Africa/Cairo' }
  };
  saveJSON('config.json', envConfig);
}

function requireAuth(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const config = loadJSON('config.json');
  if (token === config.apiKey) return next();
  return res.status(401).json({ error: 'unauthorized' });
}

app.get('/healthz', (req, res) => res.json({ ok: true, version: '1.0.0' }));

app.post('/api/chat', requireAuth, async (req, res) => {
  try {
    const { message, sessionId, language, context } = req.body;
    if (!message) return res.status(400).json({ error: 'message_required' });

    const sid = sessionId || uuidv4();
    const sessions = loadJSON('sessions.json');
    if (!sessions[sid]) {
      sessions[sid] = { id: sid, messages: [], language: language || 'ar', createdAt: Date.now() };
    }
    const session = sessions[sid];
    session.messages.push({ role: 'user', text: message, ts: Date.now() });
    if (session.messages.length > 50) session.messages = session.messages.slice(-50);

    const config = loadJSON('config.json');
    const aiConfig = config.ai || {};
    const reply = await ai.generateReply(session.messages, {
      language: session.language,
      company: config.companyName || '',
      personality: config.personality || '',
      customInstructions: config.customInstructions || '',
      apiKey: aiConfig.groqApiKey || config.groqApiKey || '',
      model: aiConfig.openaiModel || config.aiModel || 'allam-2-7b',
      temperature: aiConfig.temperature || config.temperature || 0.7,
    });

    session.messages.push({ role: 'assistant', text: reply, ts: Date.now() });
    sessions[sid] = session;
    saveJSON('sessions.json', sessions);

    res.json({ sessionId: sid, reply, timestamp: Date.now() });
  } catch (e) {
    console.error('Chat error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/sessions', requireAuth, (req, res) => {
  const sessions = loadJSON('sessions.json');
  const list = Object.values(sessions).sort((a, b) => {
    const aLast = a.messages[a.messages.length - 1]?.ts || 0;
    const bLast = b.messages[b.messages.length - 1]?.ts || 0;
    return bLast - aLast;
  }).map(s => ({
    id: s.id,
    language: s.language,
    messageCount: s.messages.length,
    createdAt: s.createdAt,
    lastMessage: s.messages[s.messages.length - 1]
  }));
  res.json(list);
});

app.get('/api/sessions/:id', requireAuth, (req, res) => {
  const sessions = loadJSON('sessions.json');
  const session = sessions[req.params.id];
  if (!session) return res.status(404).json({ error: 'not_found' });
  res.json(session);
});

app.delete('/api/sessions/:id', requireAuth, (req, res) => {
  const sessions = loadJSON('sessions.json');
  delete sessions[req.params.id];
  saveJSON('sessions.json', sessions);
  res.json({ ok: true });
});

app.get('/api/config', requireAuth, (req, res) => {
  const config = loadJSON('config.json');
  if (config.apiKey) config.apiKey = config.apiKey.slice(0, 8) + '****';
  res.json(config);
});

app.post('/api/config', requireAuth, (req, res) => {
  const current = loadJSON('config.json');
  const patch = req.body || {};
  const updated = { ...current, ...patch };
  if (patch.apiKey && patch.apiKey.includes('****')) updated.apiKey = current.apiKey;
  saveJSON('config.json', updated);
  res.json(updated);
});

app.get('/api/languages', (req, res) => {
  res.json([
    { code: 'ar', name: 'العربية', dialects: ['egyptian', 'levantian', 'gulf', 'msa'] },
    { code: 'en', name: 'English', dialects: ['american', 'british'] },
    { code: 'fr', name: 'Francais', dialects: ['france', 'canadian'] },
    { code: 'tr', name: 'Turkce' },
    { code: 'ur', name: 'اردو' },
    { code: 'hi', name: 'हिन्दी' },
    { code: 'es', name: 'Espanol' },
    { code: 'de', name: 'Deutsch' },
  ]);
});

channels.init(app, io, loadJSON, saveJSON);

if (fs.existsSync(WEB_BUILD)) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(WEB_BUILD, 'index.html'));
  });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`AR_ChatBot API running on port ${PORT}`);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err?.message || err);
});
