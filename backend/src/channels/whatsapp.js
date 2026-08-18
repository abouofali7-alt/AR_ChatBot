const { Client, LocalAuth } = require('whatsapp-web.js');
const path = require('path');

let client = null;
let state = { status: 'disconnected', qr: null, phoneNumber: null, lastError: null };
let messageHandler = null;

function getState() { return { ...state }; }

async function connect(config, loadJSON, saveJSON) {
  if (client) {
    try { await client.destroy(); } catch {}
    client = null;
  }

  client = new Client({
    authStrategy: new LocalAuth({ dataPath: path.join(__dirname, '..', '..', 'session', 'whatsapp') }),
    puppeteer: { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] }
  });

  client.on('qr', (qr) => {
    state = { ...state, status: 'qr', qr };
  });

  client.on('ready', () => {
    state = { ...state, status: 'ready', qr: null, phoneNumber: client.info?.wid?.user, lastError: null };
  });

  client.on('message', async (message) => {
    if (message.fromMe) return;
    if (message.from.endsWith('@g.us') || message.from.endsWith('@broadcast')) return;

    try {
      const { generateReply } = require('../ai');
      const sessions = loadJSON('sessions.json');
      const sid = message.from;
      if (!sessions[sid]) sessions[sid] = { id: sid, messages: [], language: 'ar', createdAt: Date.now() };
      sessions[sid].messages.push({ role: 'user', text: message.body || '', ts: Date.now() });

      let typingChat;
      try { typingChat = await message.getChat(); await typingChat.sendStateTyping(); } catch {}

      const reply = await generateReply(sessions[sid].messages, {
        language: sessions[sid].language,
        apiKey: config.groqApiKey,
        company: config.companyName || '',
      });

      sessions[sid].messages.push({ role: 'assistant', text: reply, ts: Date.now() });
      saveJSON('sessions.json', sessions);

      try { if (typingChat) await typingChat.clearState(); } catch {}
      await client.sendMessage(message.from, reply);
    } catch (e) {
      console.error('WhatsApp message error:', e.message);
    }
  });

  client.on('error', (err) => {
    state = { ...state, lastError: err?.message };
  });

  client.on('disconnected', () => {
    state = { ...state, status: 'disconnected' };
  });

  await client.initialize();
  return { ok: true, status: 'connecting' };
}

async function disconnect() {
  if (client) {
    try { await client.logout(); } catch {}
    try { await client.destroy(); } catch {}
    client = null;
  }
  state = { status: 'disconnected', qr: null, phoneNumber: null, lastError: null };
}

module.exports = { connect, disconnect, getState };
