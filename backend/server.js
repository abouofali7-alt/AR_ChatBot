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

if (process.env.GROQ_API_KEY) {
  const cfg = loadJSON('config.json');
  if (!cfg.groqApiKey) {
    cfg.groqApiKey = process.env.GROQ_API_KEY;
    saveJSON('config.json', cfg);
  }
}

function requireAuth(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const config = loadJSON('config.json');
  if (token === config.apiKey) return next();
  return res.status(401).json({ error: 'unauthorized' });
}

app.get('/healthz', (req, res) => res.json({ ok: true, version: '1.0.0' }));

app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>AR_ChatBot - AI Customer Service</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui,-apple-system,sans-serif;background:#0f172a;color:#e2e8f0;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px}
.hero{text-align:center;max-width:700px}
h1{font-size:2.5rem;background:linear-gradient(135deg,#3b82f6,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:16px}
.sub{font-size:1.1rem;color:#94a3b8;margin-bottom:40px;line-height:1.6}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;width:100%;max-width:700px;margin-bottom:40px}
.card{background:#1e293b;border:1px solid #334155;border-radius:12px;padding:24px;text-align:center;transition:transform .2s}
.card:hover{transform:translateY(-4px);border-color:#3b82f6}
.card h3{margin:8px 0 4px;color:#3b82f6}
.card p{font-size:.85rem;color:#94a3b8}
.badge{display:inline-block;background:#10b981;color:#000;padding:4px 12px;border-radius:20px;font-size:.8rem;font-weight:600;margin-bottom:20px}
.api-box{background:#1e293b;border:1px solid #334155;border-radius:12px;padding:20px;max-width:500px;width:100%;text-align:left}
.api-box h3{color:#f59e0b;margin-bottom:12px;font-size:.9rem}
code{background:#0f172a;padding:2px 6px;border-radius:4px;font-size:.8rem;color:#10b981}
pre{background:#0f172a;padding:12px;border-radius:8px;overflow-x:auto;font-size:.75rem;color:#94a3b8;margin-top:8px;line-height:1.5}
</style>
</head>
<body>
<div class="hero">
<div class="badge">Online & Active</div>
<h1>AR_ChatBot</h1>
<p class="sub">Open-source AI Customer Service Platform<br>Multi-language \u00b7 Multi-channel \u00b7 Powered by Groq AI</p>
</div>
<div class="cards">
<div class="card"><h3>8 Languages</h3><p>AR, EN, FR, TR, UR, HI, ES, DE</p></div>
<div class="card"><h3>4 Channels</h3><p>WhatsApp, Telegram, Web Widget, REST API</p></div>
<div class="card"><h3>AI Powered</h3><p>Groq + Template hybrid engine</p></div>
<div class="card"><h3>Free Hosting</h3><p>Deployed on Railway</p></div>
</div>
<div class="api-box">
<h3>Quick Test (Webhook)</h3>
<pre>POST /api/webhook
Content-Type: application/json

{
  "message": "Hello",
  "language": "en"
}</pre>
<h3 style="margin-top:16px">Authenticated API</h3>
<pre>POST /api/chat
Authorization: Bearer &lt;API_KEY&gt;
Content-Type: application/json

{
  "message": "Hello",
  "sessionId": "optional"
}</pre>
</div>
</body>
</html>`);
});

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
