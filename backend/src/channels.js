const whatsapp = require('./whatsapp');
const telegram = require('./telegram');

const channels = { whatsapp, telegram };

function init(app, io, loadJSON, saveJSON) {
  const config = loadJSON('config.json', {});

  app.get('/api/channels', (req, res) => {
    res.json([
      { id: 'whatsapp', name: 'WhatsApp', connected: whatsapp.getState().status === 'ready' },
      { id: 'telegram', name: 'Telegram', connected: telegram.getState().status === 'ready' },
      { id: 'web', name: 'Web Widget', connected: true },
      { id: 'api', name: 'REST API', connected: true },
    ]);
  });

  app.post('/api/channels/whatsapp/connect', async (req, res) => {
    try {
      const cfg = loadJSON('config.json');
      const result = await whatsapp.connect(cfg, loadJSON, saveJSON);
      res.json(result);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/channels/whatsapp/status', (req, res) => res.json(whatsapp.getState()));
  app.get('/api/channels/whatsapp/qr', (req, res) => {
    const s = whatsapp.getState();
    if (!s.qr) return res.status(404).json({ error: 'no_qr' });
    res.json({ qr: s.qr });
  });
  app.post('/api/channels/whatsapp/disconnect', async (req, res) => {
    try { await whatsapp.disconnect(); res.json({ ok: true }); } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/channels/telegram/connect', async (req, res) => {
    try {
      const cfg = loadJSON('config.json');
      const result = await telegram.connect(cfg, loadJSON, saveJSON);
      res.json(result);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/channels/telegram/status', (req, res) => res.json(telegram.getState()));
  app.post('/api/channels/telegram/disconnect', async (req, res) => {
    try { await telegram.disconnect(); res.json({ ok: true }); } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/webhook', async (req, res) => {
    try {
      const { message, sessionId, language } = req.body;
      if (!message) return res.status(400).json({ error: 'message_required' });
      const { generateReply } = require('../ai');
      const sessions = loadJSON('sessions.json');
      const sid = sessionId || require('uuid').v4();
      if (!sessions[sid]) sessions[sid] = { id: sid, messages: [], language: language || 'ar', createdAt: Date.now() };
      sessions[sid].messages.push({ role: 'user', text: message, ts: Date.now() });
      const reply = await generateReply(sessions[sid].messages, {
        language: sessions[sid].language,
        apiKey: config.groqApiKey || '',
        model: config.aiModel || 'allam-2-7b',
      });
      sessions[sid].messages.push({ role: 'assistant', text: reply, ts: Date.now() });
      saveJSON('sessions.json', sessions);
      res.json({ sessionId: sid, reply });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });
}

module.exports = { init };
