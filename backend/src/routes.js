const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DATA_DIR = path.join(__dirname, '..', 'data');

function loadJSON(file, fallback = {}) {
  const p = path.join(DATA_DIR, file);
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fallback; }
}
function saveJSON(file, data) {
  fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2), 'utf8');
}

function requireAuth(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const config = loadJSON('config.json');
  if (token === config.apiKey) return next();
  return res.status(401).json({ error: 'unauthorized' });
}

function init(app, io) {
  app.get('/api/conversations', requireAuth, (req, res) => {
    const convos = loadJSON('conversations.json', {});
    const list = Object.values(convos).map(c => ({
      id: c.id, title: c.title, createdAt: c.createdAt, updatedAt: c.updatedAt,
      messageCount: (c.messages || []).length
    })).sort((a, b) => b.updatedAt - a.updatedAt);
    res.json(list);
  });

  app.post('/api/conversations', requireAuth, (req, res) => {
    const convos = loadJSON('conversations.json', {});
    const id = uuidv4();
    const title = req.body.title || 'New Conversation';
    convos[id] = { id, title, messages: [], createdAt: Date.now(), updatedAt: Date.now() };
    saveJSON('conversations.json', convos);
    res.json({ id, title, createdAt: convos[id].createdAt });
  });

  app.get('/api/conversations/:id', requireAuth, (req, res) => {
    const convos = loadJSON('conversations.json', {});
    const c = convos[req.params.id];
    if (!c) return res.status(404).json({ error: 'not_found' });
    res.json(c);
  });

  app.put('/api/conversations/:id', requireAuth, (req, res) => {
    const convos = loadJSON('conversations.json', {});
    const c = convos[req.params.id];
    if (!c) return res.status(404).json({ error: 'not_found' });
    if (req.body.title) c.title = req.body.title;
    c.updatedAt = Date.now();
    saveJSON('conversations.json', convos);
    res.json({ ok: true });
  });

  app.delete('/api/conversations/:id', requireAuth, (req, res) => {
    const convos = loadJSON('conversations.json', {});
    delete convos[req.params.id];
    saveJSON('conversations.json', convos);
    res.json({ ok: true });
  });

  app.get('/api/conversations/:id/messages', requireAuth, (req, res) => {
    const convos = loadJSON('conversations.json', {});
    const c = convos[req.params.id];
    if (!c) return res.status(404).json({ error: 'not_found' });
    res.json(c.messages || []);
  });

  app.get('/api/settings', requireAuth, (req, res) => {
    const config = loadJSON('config.json');
    const settings = {
      companyName: config.companyName || 'AR_ChatBot',
      personality: config.personality || 'Friendly',
      customInstructions: config.customInstructions || '',
      defaultLanguage: config.defaultLanguage || 'ar',
      aiProvider: config.aiProvider || 'groq',
      aiModel: config.aiModel || 'allam-2-7b',
      temperature: config.temperature || 0.7,
      systemPrompt: config.systemPrompt || 'You are a helpful AI assistant. Answer concisely and accurately.',
      maxTokens: config.maxTokens || 1024,
      theme: config.theme || 'dark',
    };
    res.json(settings);
  });

  app.put('/api/settings', requireAuth, (req, res) => {
    const config = loadJSON('config.json');
    const allowed = ['companyName','personality','customInstructions','defaultLanguage',
      'aiProvider','aiModel','temperature','systemPrompt','maxTokens','theme','groqApiKey','geminiApiKey'];
    allowed.forEach(k => { if (req.body[k] !== undefined) config[k] = req.body[k]; });
    saveJSON('config.json', config);
    res.json({ ok: true });
  });

  app.get('/api/keys', requireAuth, (req, res) => {
    const keys = loadJSON('api_keys.json', { keys: [] });
    res.json(keys.keys.map(k => ({
      id: k.id, name: k.name, prefix: k.key.substring(0, 8) + '...',
      createdAt: k.createdAt, lastUsed: k.lastUsed, active: k.active
    })));
  });

  app.post('/api/keys', requireAuth, (req, res) => {
    const keys = loadJSON('api_keys.json', { keys: [] });
    const newKey = {
      id: uuidv4(),
      name: req.body.name || 'API Key',
      key: 'ark_' + uuidv4().replace(/-/g, ''),
      createdAt: Date.now(),
      lastUsed: null,
      active: true
    };
    keys.keys.push(newKey);
    saveJSON('api_keys.json', keys);
    res.json({ id: newKey.id, name: newKey.name, key: newKey.key, createdAt: newKey.createdAt });
  });

  app.delete('/api/keys/:id', requireAuth, (req, res) => {
    const keys = loadJSON('api_keys.json', { keys: [] });
    keys.keys = keys.keys.filter(k => k.id !== req.params.id);
    saveJSON('api_keys.json', keys);
    res.json({ ok: true });
  });

  app.post('/api/keys/:id/toggle', requireAuth, (req, res) => {
    const keys = loadJSON('api_keys.json', { keys: [] });
    const k = keys.keys.find(k => k.id === req.params.id);
    if (!k) return res.status(404).json({ error: 'not_found' });
    k.active = !k.active;
    saveJSON('api_keys.json', keys);
    res.json({ active: k.active });
  });

  app.get('/api/usage', requireAuth, (req, res) => {
    const sessions = loadJSON('sessions.json', {});
    const convos = loadJSON('conversations.json', {});
    const keys = loadJSON('api_keys.json', { keys: [] });
    let totalMessages = 0;
    Object.values(sessions).forEach(s => { totalMessages += (s.messages || []).length; });
    Object.values(convos).forEach(c => { totalMessages += (c.messages || []).length; });
    res.json({
      totalConversations: Object.keys(convos).length,
      totalSessions: Object.keys(sessions).length,
      totalMessages,
      activeKeys: keys.keys.filter(k => k.active).length,
    });
  });
}

module.exports = { init };
