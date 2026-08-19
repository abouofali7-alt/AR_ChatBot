const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'data', 'ai.log');
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try { fs.appendFileSync(LOG_FILE, line); } catch {}
}

const TEMPLATES = {
  ar: {
    egyptian: {
      greeting: ['أهلاً وسهلاً يا فندم، إيه اللي أقدر أساعدك فيه؟', 'مرحبا بيك يا فندم، قولولي إيه اللي محتاجه.', 'أهلاً يا فندم، اتفضل كلمني في أي حاجة.'],
      thanks: ['العفو يا فندم، في أي وقت.', 'أهلاً بيك يا فندم، ده واجبنا.', 'الله يخليك يا فندم، لو محتاج أي حاجة تانية كلمني.'],
      frustration: ['معلش يا فندم، أنا فاهمك. قوليلي إيه المشكلة وأنا هحلها لك.', 'آسف جداً على اللي حصل. ممكن تقولي تفاصيل أكتر؟', 'حقك عليا يا فندم. ابعتلي رقم الطلب وأنا أتتبعه لك.'],
      price: ['أسعارنا مناسبة جداً يا فندم. ممكن تقولي إيه اللي بتسأل عنه؟', 'عندنا عروض حلوة دلوقتي. قوليلي إيه اللي محتاجه وأنا أبعتلك التفاصيل.'],
      status: ['ابعتلي رقم الطلب وأنا أشوفلك الحالة حالاً.', 'ممكن تبعتلي رقم الطلب عشان أتتبعه وأرجعلك بالنتيجة؟'],
      delivery: ['ممكن تبعتلي رقم الطلب وأنا أتتبعلك الشحنة؟', 'ابعتلي رقم الطلب وأنا أشوفلك حالة التوصيل.'],
      complaint: ['آسف جداً يا فندم. ممكن تقولي إيه المشكلة بالظبط؟', 'معلش يا فندم، ابعتلي تفاصيل أكتر وأنا هتواصل مع الفريق فوراً.'],
      transfer: ['تمام يا فندم، هتواصل مع المبيعات حالاً.', 'حاضر، هبعتلك رقم المبيعات أو هحوّلك ليهم.'],
      order: ['تمام يا فندم، ابعتلي تفاصيل الطلب وأنا أعمله لك.', 'حاضر، قوليلي إيه اللي عايزه وأنا أجهزه لك.'],
    }
  },
  en: {
    american: {
      greeting: ['Hi there! How can I help you today?', 'Hello! What can I do for you?', 'Hey! How can I assist you?'],
      thanks: ['You\'re welcome! Let me know if you need anything else.', 'Happy to help! Don\'t hesitate to reach out.', 'Anytime! We\'re here for you.'],
      frustration: ['I\'m really sorry about this. Let me look into it for you right away.', 'I completely understand your frustration. Can you share more details so I can fix this?', 'I apologize for the inconvenience. Let me get this resolved for you.'],
      price: ['Our prices are very competitive. What product or service are you interested in?', 'We have some great deals right now. What are you looking for?'],
      status: ['Can you share your order number? I\'ll check the status right away.', 'I\'ll look that up for you. What\'s your order number?'],
      delivery: ['I\'ll track your shipment. What\'s your order number?', 'Let me check the delivery status for you. Order number?'],
      complaint: ['I\'m sorry to hear that. Can you tell me more about the issue?', 'I apologize for this experience. Let me help you resolve it.'],
      transfer: ['Sure, I\'ll connect you with our sales team right away.', 'Let me transfer you to someone who can help with that.'],
      order: ['Great! Tell me what you\'d like to order and I\'ll get it set up.', 'Perfect, what would you like to order?'],
    }
  },
  fr: {
    france: {
      greeting: ['Bonjour! Comment puis-je vous aider?', 'Bonjour! Qu\'est-ce que je peux faire pour vous?'],
      thanks: ['Avec plaisir! N\'hesitez pas si vous avez besoin de quoi que ce soit.', 'De rien! Je suis toujours disponible.'],
      frustration: ['Je suis vraiment desole pour cela. Laissez-moi regarder tout de suite.', 'Je comprends votre frustration. Pouvez-vous me donner plus de details?'],
    }
  }
};

const LANG_INSTRUCTIONS = {
  ar: 'اكتب بالعامية المصرية. جملة أو اتنين بس. ممنوع إيموجي أو كلام رسمي.',
  en: 'Write in casual, friendly American English. One or two sentences max. No emojis or formal language.',
  fr: 'Ecrivez en francais courant et amical. Une ou deux phrases maximum. Pas d\'emojis.',
  tr: 'Rahat ve dostane Turkce yazin. Maksimum iki cumle. Emoji kullanmayin.',
  hi: 'आसान और मित्रवत हिंदी में लिखें। अधिकतम दो वाक्य। इमोजी का उपयोग न करें।',
  es: 'Escribe en espanol casual y amigable. Maximo una o dos oraciones. Sin emojis.',
  de: 'Schreiben Sie in umgangssprachlichem Deutsch. Maximal ein bis zwei Satze. Keine Emojis.',
  ur: 'آسان اور دوستانہ اردو میں لکھیں۔ زیادہ سے زیادہ دو جملے۔ ایموجی استعمال نہ کریں۔',
};

function matchTemplate(text, lang, dialect) {
  const langTemplates = TEMPLATES[lang];
  if (!langTemplates) return null;
  const dialectTemplates = langTemplates[dialect] || Object.values(langTemplates)[0];
  if (!dialectTemplates) return null;

  const lower = text.toLowerCase().trim();

  const patterns = {
    greeting: /^(أهلا|هلا|مرحبا|صباح|مساء|ازيك|عامل|اخبار|سلام|hi|hello|hey|bonjour|salut)/i,
    thanks: /(شكر|ممتاز|تمام|حلو|برافو|thanks|thank|good|great|perfect|merci|bravo)/i,
    frustration: /(زعل|غضب|بطيء|متأخر|خربان|سيء|مش راضي|مفيش نتيجة|هشتكي|وحش|غش|نصب|sorry|bad|terrible|worst|angry|frustrat|desole|mauvais|schlecht)/i,
    price: /(سعر|كم ثمن|كام|بكام|سعره|غالي|رخيص|price|cost|how much|combien|prix|costar|preis)/i,
    status: /(حالة|تتبع|وين|فين|وصل|status|track|order number|suivi|comando|status)/i,
    delivery: /(توصيل|شحن|وصل|وصول|وصلت|delivery|ship|deliver|livraison|entrega|lieferung)/i,
    complaint: /(شكوى|مشكلة|عيوب|مرتجع|استرجاع|مش شغال|complaint|problem|issue|broken|defect|reclamation|problema|problem)/i,
    transfer: /(مبيعات|بائع|مندوب|عايز أتكلم|اتصل|transfer|sales|agent|represent|vente|verkauf)/i,
    order: /(عايز أطلب|طلب|أطلب|شراء|شريت|order|buy|purchase|commander|kaufen|orden)/i,
  };

  for (const [category, pattern] of Object.entries(patterns)) {
    if (pattern.test(lower) && dialectTemplates[category]) {
      const options = dialectTemplates[category];
      return options[Math.floor(Math.random() * options.length)];
    }
  }
  return null;
}

async function callGroq(messages, systemPrompt, apiKey, model, temperature) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: model || 'allam-2-7b',
      messages: [{ role: 'system', content: systemPrompt }, ...messages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.text || m.content || '' }))],
      temperature: temperature || 0.7,
      max_tokens: 4096,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Groq API error ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callGemini(messages, systemPrompt, apiKey, model, temperature) {
  const modelName = model || 'gemini-3.6-flash';
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.text || m.content || '' }]
  }));
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        temperature: temperature || 0.7,
        maxOutputTokens: 8192,
      },
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

function cleanReply(text) {
  let t = (text || '').trim();
  t = t.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  t = t.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}\u{1F900}-\u{1FAFF}]/gu, '').trim();
  t = t.replace(/\bأنا\s+(?:روبوت|مساعد\s+(?:ذكاء|افتراضي)|بوت|AI assistant)\b/gi, '');
  t = t.replace(/\bI\s+am\s+(?:an?\s+)?(?:AI|bot|assistant|robot)\b/gi, '');
  t = t.replace(/\bJe\s+suis\s+(?:un?\s+)?(?:IA|bot|assistant|robot)\b/gi, '');
  t = t.replace(/\s{2,}/g, ' ').trim();
  return t;
}

async function generateReply(messages, opts = {}) {
  const lang = opts.language || 'ar';
  const dialect = opts.dialect || (lang === 'ar' ? 'egyptian' : lang === 'en' ? 'american' : 'france');

  const lastUser = [...messages].reverse().find(m => m.role === 'user');
  if (lastUser) {
    const template = matchTemplate(lastUser.text || lastUser.content || '', lang, dialect);
    if (template) {
      log(`template [${lang}/${dialect}]: "${template.substring(0, 60)}"`);
      return template;
    }
  }

  const langInstruction = LANG_INSTRUCTIONS[lang] || LANG_INSTRUCTIONS.en;
  const personality = opts.personality || '';
  const company = opts.company || '';
  const custom = opts.customInstructions || '';

  const systemPrompt = `You are a helpful, friendly AI assistant${company ? ` working at ${company}` : ''}.
${personality ? `Personality: ${personality}` : ''}
Language rules: ${langInstruction}
${custom ? `Additional instructions: ${custom}` : ''}
Rules:
- Be natural and helpful
- Answer thoroughly with complete code and explanations
- CRITICAL: ALL code MUST be wrapped in proper markdown code blocks with language tag like \`\`\`python ... \`\`\` or \`\`\`javascript ... \`\`\` or \`\`\`html ... \`\`\` etc. Never output raw code without markdown fencing.
- Never truncate responses prematurely
- Reply in the same language the user used.`;

  const provider = opts.provider || 'gemini';
  const geminiModels = ['gemini-3.5-flash', 'gemini-3-flash-preview', 'gemini-3.6-flash', 'gemini-2.5-flash'];

  async function tryGemini(model) {
    return await callGemini(
      messages.slice(-8), systemPrompt, opts.geminiApiKey, model, opts.temperature || 0.7
    );
  }

  async function tryGroq() {
    return await callGroq(
      messages.slice(-8), systemPrompt, opts.apiKey || process.env.GROQ_API_KEY,
      'allam-2-7b', opts.temperature || 0.7
    );
  }

  let rawReply = '';

  if (provider === 'gemini' && opts.geminiApiKey) {
    const primaryModel = opts.model || geminiModels[0];
    const models = [primaryModel, ...geminiModels.filter(m => m !== primaryModel)];

    for (const model of models) {
      try {
        rawReply = await tryGemini(model);
        log(`AI [${lang}/gemini/${model}]`);
        break;
      } catch (e) {
        log(`Gemini ${model} failed: ${e.message.substring(0, 100)}`);
        continue;
      }
    }

    if (!rawReply && opts.apiKey) {
      try {
        rawReply = await tryGroq();
        log(`AI [${lang}/groq] (fallback from gemini)`);
      } catch (e) {
        log(`Groq fallback also failed: ${e.message.substring(0, 100)}`);
      }
    }
  } else {
    try {
      rawReply = await tryGroq();
      log(`AI [${lang}/groq]`);
    } catch (e) {
      log(`Groq failed: ${e.message.substring(0, 100)}`);
    }
  }

  if (rawReply) {
    return cleanReply(rawReply);
  }

  log(`All providers failed for lang=${lang}`);
  return 'عذراً، فيه مشكلة مؤقتة. جرب تاني بعد شوية.' + ' / Sorry, there\'s a temporary issue. Please try again shortly.';
}

module.exports = { generateReply, cleanReply, matchTemplate };
