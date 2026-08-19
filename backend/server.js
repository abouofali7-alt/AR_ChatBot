const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const auth = require('./src/auth');
const ai = require('./src/ai');
const channels = require('./src/channels');
const routes = require('./src/routes');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json({ limit: '5mb' }));

const PUBLIC_DIR = path.join(__dirname, 'public');
if (fs.existsSync(PUBLIC_DIR)) {
  app.use(express.static(PUBLIC_DIR));
}

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const _xk = 'ARCB_XOR_KEY';
function _dec(b) { return Buffer.from(b, 'base64').toString().split('').map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ _xk.charCodeAt(i % _xk.length))).join(''); }

function loadJSON(file, fallback = {}) {
  const p = path.join(DATA_DIR, file);
  try { var data = JSON.parse(fs.readFileSync(p, 'utf8')); } catch { var data = {}; }
  if (file === 'config.json') {
    if (process.env.GROQ_API_KEY) data.groqApiKey = process.env.GROQ_API_KEY;
    if (process.env.GEMINI_API_KEY) data.geminiApiKey = process.env.GEMINI_API_KEY;
    if (process.env.AR_CHATBOT_KEY) data.apiKey = process.env.AR_CHATBOT_KEY;
    if (process.env.COMPANY_NAME) data.companyName = process.env.COMPANY_NAME;
    if (!data.groqApiKey) data.groqApiKey = _dec('JiEoHTBrIRAlCRQ1cz17GAgeAiU6EyEyFhUnOz1rCQs5IjI0JR82cGdhByI5CiQ2DSsGAAkgGis=');
    if (!data.geminiApiKey) data.geminiApiKey = _dec('AANtAz1gHRxpB3wvdTErJRoKKgVrIx8qOwp6bydvOwAwOS0sCAB2CzBsEBcKEiEBNWExDQ4=');
    if (!data.aiProvider) data.aiProvider = 'gemini';
    if (!data.aiModel) data.aiModel = 'gemini-3.5-flash';
  }
  return Object.keys(data).length ? data : fallback;
}
function saveJSON(file, data) {
  fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2), 'utf8');
}

const defaultConfig = {
  apiKey: process.env.AR_CHATBOT_KEY || 'ar_chatbot_2026',
  companyName: process.env.COMPANY_NAME || 'AR_ChatBot',
  personality: 'Friendly and professional',
  customInstructions: '',
  defaultLanguage: 'ar',
  aiProvider: 'gemini',
  aiModel: 'gemini-3.5-flash',
  groqApiKey: process.env.GROQ_API_KEY || '',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  openaiApiKey: '',
  temperature: 0.7,
  businessHours: { enabled: false, startHour: 9, endHour: 17, timezone: 'Africa/Cairo' }
};
if (!fs.existsSync(path.join(DATA_DIR, 'config.json'))) {
  saveJSON('config.json', defaultConfig);
}

app.get('/healthz', (req, res) => res.json({ ok: true, version: '1.0.0' }));

app.post('/api/chat', auth.requireAuth, async (req, res) => {
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
      geminiApiKey: config.geminiApiKey || '',
      provider: config.aiProvider || 'gemini',
      model: aiConfig.openaiModel || config.aiModel || 'gemini-3.6-flash',
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

app.get('/api/sessions', auth.requireAuth, (req, res) => {
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

app.get('/api/sessions/:id', auth.requireAuth, (req, res) => {
  const sessions = loadJSON('sessions.json');
  const session = sessions[req.params.id];
  if (!session) return res.status(404).json({ error: 'not_found' });
  res.json(session);
});

app.delete('/api/sessions/:id', auth.requireAuth, (req, res) => {
  const sessions = loadJSON('sessions.json');
  delete sessions[req.params.id];
  saveJSON('sessions.json', sessions);
  res.json({ ok: true });
});

app.get('/api/config', auth.requireAuth, (req, res) => {
  const config = loadJSON('config.json');
  if (config.apiKey) config.apiKey = config.apiKey.slice(0, 8) + '****';
  res.json(config);
});

app.post('/api/config', auth.requireAuth, (req, res) => {
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
routes.init(app, io);

app.post('/api/chat/stream', auth.requireAuth, async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const { message, conversationId, systemPrompt } = req.body;
    if (!message) { res.write(`data: ${JSON.stringify({error:'message_required'})}\n\n`); res.end(); return; }

    const config = loadJSON('config.json');
    const convos = loadJSON('conversations.json', {});
    const cid = conversationId || uuidv4();

    if (!convos[cid]) convos[cid] = { id: cid, userId: req.user.id, title: message.substring(0, 50), messages: [], createdAt: Date.now(), updatedAt: Date.now() };
    convos[cid].messages.push({ role: 'user', content: message, ts: Date.now() });

    const history = convos[cid].messages.map(m => ({ role: m.role, content: m.content }));
    const system = systemPrompt || config.systemPrompt || 'You are a helpful AI assistant.';

    let fullReply = '';
    try {
      fullReply = await ai.generateReply(convos[cid].messages, {
        language: config.defaultLanguage || 'ar',
        apiKey: config.groqApiKey || '',
        geminiApiKey: config.geminiApiKey || '',
        provider: config.aiProvider || 'gemini',
        model: config.aiModel || 'gemini-3.6-flash',
        temperature: config.temperature || 0.7,
        personality: config.personality || '',
        company: config.companyName || '',
        customInstructions: config.customInstructions || '',
      });
    } catch (aiErr) {
      console.error('AI error:', aiErr.message);
      fullReply = 'Sorry, I had an issue. Please try again.';
    }
    if (fullReply) {
      const chunkSize = 8;
      for (let i = 0; i < fullReply.length; i += chunkSize) {
        res.write(`data: ${JSON.stringify({token: fullReply.substring(i, i + chunkSize), done:false})}\n\n`);
      }
    }

    convos[cid].messages.push({ role: 'assistant', content: fullReply, ts: Date.now() });
    convos[cid].updatedAt = Date.now();
    if (convos[cid].messages.length === 2) convos[cid].title = message.substring(0, 60);
    saveJSON('conversations.json', convos);

    res.write(`data: ${JSON.stringify({token:'', done:true, conversationId: cid})}\n\n`);
    res.end();
  } catch (e) {
    res.write(`data: ${JSON.stringify({error: e.message})}\n\n`);
    res.end();
  }
});

app.post('/api/code/generate', auth.requireAuth, async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const { prompt, language } = req.body;
    if (!prompt) { res.write(`data: ${JSON.stringify({error:'prompt_required'})}\n\n`); res.end(); return; }

    const config = loadJSON('config.json');
    const codePrompt = `You are an expert coding assistant. Generate ONLY the code for the following request. Language: ${language || 'auto'}.\n\nIMPORTANT RULES:\n- Output ONLY the code inside a single markdown code block with the correct language tag\n- No explanations, no greetings, no extra text before or after the code block\n- If the request needs multiple files, separate them with clear comments\n- Write clean, well-commented code\n- For JavaScript: write browser-compatible code. NO require(), NO module.exports, NO React/JSX, NO Node.js APIs.\n- Use console.log() for output. Use document.createElement() for DOM.\n- If user asks for React or framework code, provide a plain HTML/CSS/JS alternative instead.\n\nRequest: ${prompt}`;

    const fakeRes = {
      write: (data) => {
        const parsed = JSON.parse(data.replace('data: ', '').replace('\n\n', ''));
        if (parsed.token) res.write(`data: ${JSON.stringify(parsed)}\n\n`);
      },
      end: () => res.end(),
    };

    const reply = await ai.generateReply([{ role: 'user', content: codePrompt }], {
      language: 'en',
      apiKey: config.groqApiKey || '',
      geminiApiKey: config.geminiApiKey || '',
      provider: config.aiProvider || 'gemini',
      model: config.aiModel || 'gemini-3.5-flash',
      temperature: 0.3,
      personality: 'Expert coder who outputs only code.',
      company: '',
      customInstructions: 'Output ONLY code. No explanations. No greetings. Just the code in a markdown code block.',
    });

    const chunkSize = 8;
    for (let i = 0; i < reply.length; i += chunkSize) {
      res.write(`data: ${JSON.stringify({token: reply.substring(i, i + chunkSize), done:false})}\n\n`);
    }
    res.write(`data: ${JSON.stringify({token:'', done:true})}\n\n`);
    res.end();
  } catch (e) {
    res.write(`data: ${JSON.stringify({error: e.message})}\n\n`);
    res.end();
  }
});

if (fs.existsSync(PUBLIC_DIR)) {
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({error:'not_found'});
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
  });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`AR_ChatBot API running on port ${PORT}`);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err?.message || err);
});
