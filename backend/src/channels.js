let whatsapp = null;
let telegram = null;

function getWhatsApp() {
  if (!whatsapp) whatsapp = require('./channels/whatsapp');
  return whatsapp;
}
function getTelegram() {
  if (!telegram) telegram = require('./channels/telegram');
  return telegram;
}

function init(app, io, loadJSON, saveJSON) {
  app.get('/api/channels', (req, res) => {
    let waStatus = 'disconnected';
    let tgStatus = 'disconnected';
    try { waStatus = getWhatsApp().getState().status; } catch {}
    try { tgStatus = getTelegram().getState().status; } catch {}
    res.json([
      { id: 'whatsapp', name: 'WhatsApp', connected: waStatus === 'ready' },
      { id: 'telegram', name: 'Telegram', connected: tgStatus === 'ready' },
      { id: 'web', name: 'Web Widget', connected: true },
      { id: 'api', name: 'REST API', connected: true },
    ]);
  });

  app.post('/api/channels/whatsapp/connect', async (req, res) => {
    try {
      const cfg = loadJSON('config.json');
      const result = await getWhatsApp().connect(cfg, loadJSON, saveJSON);
      res.json(result);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/channels/whatsapp/status', (req, res) => {
    try { res.json(getWhatsApp().getState()); } catch { res.json({ status: 'unavailable' }); }
  });
  app.get('/api/channels/whatsapp/qr', (req, res) => {
    try {
      const s = getWhatsApp().getState();
      if (!s.qr) return res.status(404).json({ error: 'no_qr' });
      res.json({ qr: s.qr });
    } catch { res.status(503).json({ error: 'unavailable' }); }
  });
  app.post('/api/channels/whatsapp/disconnect', async (req, res) => {
    try { await getWhatsApp().disconnect(); res.json({ ok: true }); } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/channels/telegram/connect', async (req, res) => {
    try {
      const cfg = loadJSON('config.json');
      const result = await getTelegram().connect(cfg, loadJSON, saveJSON);
      res.json(result);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/channels/telegram/status', (req, res) => {
    try { res.json(getTelegram().getState()); } catch { res.json({ status: 'unavailable' }); }
  });
  app.post('/api/channels/telegram/disconnect', async (req, res) => {
    try { await getTelegram().disconnect(); res.json({ ok: true }); } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/webhook', async (req, res) => {
    try {
      const { message, sessionId, language } = req.body;
      if (!message) return res.status(400).json({ error: 'message_required' });
      const { generateReply } = require('./ai');
      const config = loadJSON('config.json', {});
      const sessions = loadJSON('sessions.json');
      const sid = sessionId || require('uuid').v4();
      if (!sessions[sid]) sessions[sid] = { id: sid, messages: [], language: language || 'ar', createdAt: Date.now() };
      sessions[sid].messages.push({ role: 'user', text: message, ts: Date.now() });
      const reply = await generateReply(sessions[sid].messages, {
        language: sessions[sid].language,
        apiKey: config.groqApiKey || '',
        geminiApiKey: config.geminiApiKey || '',
        provider: config.aiProvider || 'gemini',
        model: config.aiModel || 'gemini-3.6-flash',
        temperature: config.temperature || 0.7,
      });
      sessions[sid].messages.push({ role: 'assistant', text: reply, ts: Date.now() });
      saveJSON('sessions.json', sessions);
      res.json({ sessionId: sid, reply });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });
}

module.exports = { init };
