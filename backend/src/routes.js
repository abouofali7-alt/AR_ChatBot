const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const auth = require('./auth');

const DATA_DIR = path.join(__dirname, '..', 'data');

function loadJSON(file, fallback = {}) {
  const p = path.join(DATA_DIR, file);
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fallback; }
}
function saveJSON(file, data) {
  fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2), 'utf8');
}

function uid(req) { return req.user ? req.user.id : '__system__'; }
function isAdmin(req) { return req.user && req.user.accountType === 'admin'; }

function init(app, io) {

  app.post('/api/auth/register', async (req, res) => {
    const { name, email, password, accountType } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, and password required' });
    const types = ['personal', 'business', 'developer', 'admin'];
    const type = types.includes(accountType) ? accountType : 'personal';
    const result = await auth.register(name, email, password, type);
    if (result.error) return res.status(400).json({ error: result.error });
    res.json(result);
  });

  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const result = await auth.login(email, password);
    if (result.error) return res.status(401).json({ error: result.error });
    res.json(result);
  });

  app.get('/api/auth/me', auth.requireAuth, (req, res) => {
    const user = auth.getUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  });

  app.get('/api/auth/users', auth.requireAuth, auth.requireAdmin, (req, res) => {
    const db = auth.getUsers ? { users: [] } : { users: [] };
    try {
      const u = require('./auth');
      const all = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'users.json'), 'utf8'));
      res.json(all.users.map(u => ({ id: u.id, name: u.name, email: u.email, accountType: u.accountType, createdAt: u.createdAt, lastLogin: u.lastLogin })));
    } catch { res.json([]); }
  });

  app.get('/api/conversations', auth.requireAuth, (req, res) => {
    const userId = uid(req);
    const allConvos = loadJSON('conversations.json', {});
    const list = Object.values(allConvos).filter(c => c.userId === userId).map(c => ({
      id: c.id, title: c.title, createdAt: c.createdAt, updatedAt: c.updatedAt,
      messageCount: (c.messages || []).length
    })).sort((a, b) => b.updatedAt - a.updatedAt);
    res.json(list);
  });

  app.post('/api/conversations', auth.requireAuth, (req, res) => {
    const userId = uid(req);
    const convos = loadJSON('conversations.json', {});
    const id = uuidv4();
    const title = req.body.title || 'New Conversation';
    convos[id] = { id, userId, title, messages: [], createdAt: Date.now(), updatedAt: Date.now() };
    saveJSON('conversations.json', convos);
    res.json({ id, title, createdAt: convos[id].createdAt });
  });

  app.get('/api/conversations/:id', auth.requireAuth, (req, res) => {
    const convos = loadJSON('conversations.json', {});
    const c = convos[req.params.id];
    if (!c) return res.status(404).json({ error: 'not_found' });
    if (!isAdmin(req) && c.userId !== uid(req)) return res.status(403).json({ error: 'forbidden' });
    res.json(c);
  });

  app.put('/api/conversations/:id', auth.requireAuth, (req, res) => {
    const convos = loadJSON('conversations.json', {});
    const c = convos[req.params.id];
    if (!c) return res.status(404).json({ error: 'not_found' });
    if (!isAdmin(req) && c.userId !== uid(req)) return res.status(403).json({ error: 'forbidden' });
    if (req.body.title) c.title = req.body.title;
    c.updatedAt = Date.now();
    saveJSON('conversations.json', convos);
    res.json({ ok: true });
  });

  app.delete('/api/conversations/:id', auth.requireAuth, (req, res) => {
    const convos = loadJSON('conversations.json', {});
    const c = convos[req.params.id];
    if (!c) return res.status(404).json({ error: 'not_found' });
    if (!isAdmin(req) && c.userId !== uid(req)) return res.status(403).json({ error: 'forbidden' });
    delete convos[req.params.id];
    saveJSON('conversations.json', convos);
    res.json({ ok: true });
  });

  app.get('/api/conversations/:id/messages', auth.requireAuth, (req, res) => {
    const convos = loadJSON('conversations.json', {});
    const c = convos[req.params.id];
    if (!c) return res.status(404).json({ error: 'not_found' });
    if (!isAdmin(req) && c.userId !== uid(req)) return res.status(403).json({ error: 'forbidden' });
    res.json(c.messages || []);
  });

  app.get('/api/settings', auth.requireAuth, (req, res) => {
    const userId = uid(req);
    const userSettings = loadJSON('user_settings.json', {});
    const s = userSettings[userId] || {};
    const config = loadJSON('config.json');
    res.json({
      companyName: s.companyName || config.companyName || 'AR_ChatBot',
      personality: s.personality || config.personality || 'Friendly',
      customInstructions: s.customInstructions || config.customInstructions || '',
      defaultLanguage: s.defaultLanguage || config.defaultLanguage || 'ar',
      aiProvider: s.aiProvider || config.aiProvider || 'gemini',
      aiModel: s.aiModel || config.aiModel || 'gemini-3.5-flash',
      temperature: s.temperature || config.temperature || 0.7,
      systemPrompt: s.systemPrompt || config.systemPrompt || 'You are a helpful AI assistant.',
      maxTokens: s.maxTokens || config.maxTokens || 2048,
    });
  });

  app.put('/api/settings', auth.requireAuth, (req, res) => {
    const userId = uid(req);
    const userSettings = loadJSON('user_settings.json', {});
    if (!userSettings[userId]) userSettings[userId] = {};
    const allowed = ['companyName','personality','customInstructions','defaultLanguage',
      'aiProvider','aiModel','temperature','systemPrompt','maxTokens','theme'];
    allowed.forEach(k => { if (req.body[k] !== undefined) userSettings[userId][k] = req.body[k]; });
    saveJSON('user_settings.json', userSettings);
    res.json({ ok: true });
  });

  app.get('/api/keys', auth.requireAuth, (req, res) => {
    const userId = uid(req);
    const allKeys = loadJSON('api_keys.json', { keys: [] });
    const userKeys = isAdmin(req) ? allKeys.keys : allKeys.keys.filter(k => k.userId === userId);
    res.json(userKeys.map(k => ({
      id: k.id, name: k.name, prefix: k.key.substring(0, 8) + '...',
      createdAt: k.createdAt, lastUsed: k.lastUsed, active: k.active
    })));
  });

  app.post('/api/keys', auth.requireAuth, (req, res) => {
    const userId = uid(req);
    const allKeys = loadJSON('api_keys.json', { keys: [] });
    const newKey = {
      id: uuidv4(),
      userId,
      name: req.body.name || 'API Key',
      key: 'ark_' + uuidv4().replace(/-/g, ''),
      createdAt: Date.now(),
      lastUsed: null,
      active: true
    };
    allKeys.keys.push(newKey);
    saveJSON('api_keys.json', allKeys);
    res.json({ id: newKey.id, name: newKey.name, key: newKey.key, createdAt: newKey.createdAt });
  });

  app.delete('/api/keys/:id', auth.requireAuth, (req, res) => {
    const userId = uid(req);
    const allKeys = loadJSON('api_keys.json', { keys: [] });
    const k = allKeys.keys.find(k => k.id === req.params.id);
    if (!k) return res.status(404).json({ error: 'not_found' });
    if (!isAdmin(req) && k.userId !== userId) return res.status(403).json({ error: 'forbidden' });
    allKeys.keys = allKeys.keys.filter(k => k.id !== req.params.id);
    saveJSON('api_keys.json', allKeys);
    res.json({ ok: true });
  });

  app.post('/api/keys/:id/toggle', auth.requireAuth, (req, res) => {
    const userId = uid(req);
    const allKeys = loadJSON('api_keys.json', { keys: [] });
    const k = allKeys.keys.find(k => k.id === req.params.id);
    if (!k) return res.status(404).json({ error: 'not_found' });
    if (!isAdmin(req) && k.userId !== userId) return res.status(403).json({ error: 'forbidden' });
    k.active = !k.active;
    saveJSON('api_keys.json', allKeys);
    res.json({ active: k.active });
  });

  app.get('/api/usage', auth.requireAuth, (req, res) => {
    const userId = uid(req);
    const convos = loadJSON('conversations.json', {});
    const myConvos = isAdmin(req) ? Object.values(convos) : Object.values(convos).filter(c => c.userId === userId);
    let totalMessages = 0;
    myConvos.forEach(c => { totalMessages += (c.messages || []).length; });
    const allKeys = loadJSON('api_keys.json', { keys: [] });
    const myKeys = isAdmin(req) ? allKeys.keys : allKeys.keys.filter(k => k.userId === userId);
    res.json({
      totalConversations: myConvos.length,
      totalMessages,
      activeKeys: myKeys.filter(k => k.active).length,
      accountType: req.user.accountType,
    });
  });
}

module.exports = { init };
