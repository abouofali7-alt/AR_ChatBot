const { generateReply } = require('../ai');

let bot = null;
let state = { status: 'disconnected', botUsername: null, lastError: null };

function getState() { return { ...state }; }

async function connect(config, loadJSON, saveJSON) {
  const token = config.telegramBotToken;
  if (!token) throw new Error('telegramBotToken is required in config');

  try {
    const { Telegraf } = require('telegraf');
    bot = new Telegraf(token);

    bot.start((ctx) => {
      ctx.reply('Welcome! Send me any message and I will help you.');
    });

    bot.on('message', async (ctx) => {
      if (ctx.message.text === '/start') return;
      try {
        const sessions = loadJSON('sessions.json');
        const sid = `tg_${ctx.from.id}`;
        if (!sessions[sid]) sessions[sid] = { id: sid, messages: [], language: config.defaultLanguage || 'ar', createdAt: Date.now() };
        sessions[sid].messages.push({ role: 'user', text: ctx.message.text || '', ts: Date.now() });
        if (sessions[sid].messages.length > 50) sessions[sid].messages = sessions[sid].messages.slice(-50);

        await ctx.replyWithChatAction('typing');
        const reply = await generateReply(sessions[sid].messages, {
          language: sessions[sid].language,
          apiKey: config.groqApiKey || '',
          model: config.aiModel || 'allam-2-7b',
          company: config.companyName || '',
          temperature: config.temperature || 0.7,
        });

        sessions[sid].messages.push({ role: 'assistant', text: reply, ts: Date.now() });
        saveJSON('sessions.json', sessions);

        await ctx.reply(reply);
      } catch (e) {
        await ctx.reply('Sorry, something went wrong. Please try again.');
      }
    });

    bot.launch();
    state = { status: 'ready', botUsername: bot.context?.botInfo?.username || 'connected', lastError: null };
    return { ok: true };
  } catch (e) {
    state = { ...state, lastError: e.message };
    throw e;
  }
}

async function disconnect() {
  if (bot) {
    bot.stop();
    bot = null;
  }
  state = { status: 'disconnected', botUsername: null, lastError: null };
}

module.exports = { connect, disconnect, getState };
