const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { Translate } = require('@google-cloud/translate').v2;

//تنظیمات بات
const token = process.env.TELEGRAM_BOT_TOKEN || 'YOUR_TELEGRAM_BOT_TOKEN';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || 'YOUR_OPENROUTER_API_KEY';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'YOUR_GEMINI_API_KEY';
const SITE_URL = process.env.SITE_URL || 'YOUR_SITE_URL';
const SITE_NAME = process.env.SITE_NAME || 'My AI';

// ایجاد ربات با حالت پُلینگ
const bot = new TelegramBot(token, { polling: true });
const userChats = {};
const userSettings = {};

// تعریف مدل‌های پشتیبانی شده
const availableModels = {
  'gemini-2.5-pro': {
    id: 'google/gemini-2.5-pro-exp-03-25:free',
    name: ' پیشرفته',
    description: 'دستیار قدرتمند با توانایی تحلیل تصویر و متن',
    capabilities: ['text', 'image'],
    emoji: '🌟',
    useDirectAPI: true  // استفاده از API مستقیم Gemini
  },
  'llama4-scout': {
    id: 'meta-llama/llama-4-scout:free',
    name: ' استاندارد',
    description: 'دستیار عمومی با کیفیت بالا',
    capabilities: ['text'],
    emoji: '🚀',
    useDirectAPI: false
  },
  'nemotron-ultra': {
    id: 'nvidia/llama-3.1-nemotron-ultra-253b-v1:free',
    name: ' Ultra',
    description: 'دستیار فوق‌العاده قدرتمند برای تحلیل‌های پیچیده',
    capabilities: ['text'],
    emoji: '⚡',
    useDirectAPI: false
  },
  'nemotron-70b': {
    id: 'nvidia/llama-3.1-nemotron-70b-instruct:free',
    name: ' قوی',
    description: 'دستیار قدرتمند برای مکالمات روزمره',
    capabilities: ['text'],
    emoji: '💪',
    useDirectAPI: false
  },
  'mistral-small': {
    id: 'mistralai/mistral-small-24b-instruct-2501:free',
    name: ' سریع',
    description: 'دستیار سریع برای پاسخ‌های کوتاه',
    capabilities: ['text'],
    emoji: '⚡',
    useDirectAPI: false
  },
  'deepseek-r1': {
    id: 'deepseek/deepseek-r1-zero:free',
    name: ' عمیق',
    description: 'دستیار تخصصی برای تحلیل‌های عمیق',
    capabilities: ['text'],
    emoji: '🔍',
    useDirectAPI: false
  },
  'deepcoder': {
    id: 'agentica-org/deepcoder-14b-preview:free',
    name: ' کدنویس',
    description: 'دستیار تخصصی برای کدنویسی و سوالات برنامه‌نویسی',
    capabilities: ['text'],
    emoji: '💻',
    useDirectAPI: false
  },
  'qwen-32b': {
    id: 'qwen/qwq-32b:free',
    name: ' چین',
    description: 'دستیار با توانایی در موضوعات مربوط به چین و آسیا',
    capabilities: ['text'],
    emoji: '🇨🇳',
    useDirectAPI: false
  },
  'moonlight': {
    id: 'moonshotai/moonlight-16b-a3b-instruct:free',
    name: ' مهتاب',
    description: 'دستیار با خلاقیت بالا برای نوشتن و ایده‌پردازی',
    capabilities: ['text'],
    emoji: '🌙',
    useDirectAPI: false
  }
};

// تغییر مدل پیش‌فرض به llama4-scout
const defaultModelKey = 'llama4-scout';

// ایجاد نمونه Google Translate اگر کلید API موجود باشد
let translate;
try {
  translate = new Translate({
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
  });
} catch (error) {
  console.warn('هشدار: امکان استفاده از سرویس ترجمه گوگل وجود ندارد. قابلیت ترجمه غیرفعال خواهد بود.');
}

// تابع ایجاد تنظیمات کاربر
function initUserSettings(userId) {
  if (!userSettings[userId]) {
    userSettings[userId] = {
      model: defaultModelKey,  // مدل پیش‌فرض llama4-scout
      autoTranslate: false,    // ترجمه خودکار غیرفعال به صورت پیش‌فرض
      preferredLanguage: 'fa'
    };
  }
  return userSettings[userId];
}

// تابع ترجمه متن
async function translateText(text, targetLanguage) {
  try {
    if (!translate) {
      console.warn('هشدار: سرویس ترجمه پیکربندی نشده است.');
      return text;
    }
    
    const [translation] = await translate.translate(text, targetLanguage);
    return translation;
  } catch (error) {
    console.error('خطا در ترجمه متن:', error);
    return text;
  }
}

// تابع دریافت پاسخ از API Gemini
async function getGeminiResponse(messages) {
  try {
    // تبدیل پیام‌ها به فرمت مورد نیاز Gemini
    const lastUserMessage = messages.filter(msg => msg.role === 'user').pop();
    let content = [];
    
    if (Array.isArray(lastUserMessage.content)) {
      // پیام شامل تصویر است
      content = lastUserMessage.content;
    } else {
      // پیام فقط متنی است
      content = [{ text: lastUserMessage.content }];
    }
    
    const systemMessage = messages.find(msg => msg.role === 'system');
    if (systemMessage) {
      // اضافه کردن پیام سیستم به عنوان بخشی از پیام ورودی
      content.unshift({ text: `${systemMessage.content}\n\n` });
    }
    
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{
          parts: content
        }]
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.data.candidates && response.data.candidates.length > 0 &&
        response.data.candidates[0].content && response.data.candidates[0].content.parts) {
      return response.data.candidates[0].content.parts[0].text;
    } else {
      return 'متأسفانه در حال حاضر نمی‌توانم پاسخ دهم. لطفاً بعداً دوباره تلاش کنید.';
    }
  } catch (error) {
    console.error('خطا در دریافت پاسخ از Gemini API:', error.message);
    if (error.response) {
      console.error('پاسخ API:', error.response.data);
    }
    return 'متأسفانه در حال حاضر نمی‌توانم پاسخ دهم. لطفاً بعداً دوباره تلاش کنید.';
  }
}

// تابع دریافت پاسخ از API OpenRouter
async function getOpenRouterResponse(messages, modelKey) {
  try {
    const model = availableModels[modelKey] || availableModels[defaultModelKey];
    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model: model.id,
      messages: messages
    }, {
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': SITE_URL,
        'X-Title': SITE_NAME,
        'Content-Type': 'application/json'
      }
    });

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('خطا در دریافت پاسخ از OpenRouter:', error.message);
    if (error.response) {
      console.error('پاسخ API:', error.response.data);
    }
    return 'متأسفانه در حال حاضر نمی‌توانم پاسخ دهم. لطفاً بعداً دوباره تلاش کنید.';
  }
}

// تابع جامع دریافت پاسخ از API
async function getAIResponse(messages, modelKey) {
  const model = availableModels[modelKey] || availableModels[defaultModelKey];
  
  // استفاده از API مستقیم برای مدل‌هایی که نیاز دارند
  if (model.useDirectAPI && modelKey === 'gemini-2.5-pro') {
    return await getGeminiResponse(messages);
  } else {
    return await getOpenRouterResponse(messages, modelKey);
  }
}

// تابع دانلود فایل از تلگرام (برای پردازش موقت بدون ذخیره‌سازی)
async function downloadTelegramFile(fileId) {
  const fileInfo = await bot.getFile(fileId);
  const fileUrl = `https://api.telegram.org/file/bot${token}/${fileInfo.file_path}`;
  const response = await axios({
    url: fileUrl,
    method: 'GET',
    responseType: 'arraybuffer'
  });
  return Buffer.from(response.data, 'binary');
}

// تابع دریافت پیام سیستم
function getSystemPrompt() {
  return 'شما دستیار هوش مصنوعی من هستید که به زبان فارسی به کاربران کمک می‌کنید. شما نباید مدل خود را معرفی کنید یا بگویید که یک مدل زبانی هستید. شما باید به عنوان هوش مصنوعی من پاسخ دهید. در هیچ شرایطی نباید اشاره کنید که از OpenRouter یا مدل‌های دیگر استفاده می‌کنید. همیشه باید خود را فقط به عنوان من معرفی کنید.';
}

// پردازش همه پیام‌ها
bot.on('message', async (msg) => {
  try {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const username = msg.from.username;
    const settings = initUserSettings(userId);
    
    let messageText = '';
    let messageType = 'text';
    let imageBase64 = null;
    
    // پردازش انواع مختلف پیام
    if (msg.text && !msg.text.startsWith('/')) {
      messageText = msg.text;
    } else if (msg.photo) {
      bot.sendChatAction(chatId, 'typing');
      
      const photo = msg.photo[msg.photo.length - 1];
      const fileBuffer = await downloadTelegramFile(photo.file_id);
      imageBase64 = fileBuffer.toString('base64');
      
      messageType = 'image';
      
      const model = availableModels[settings.model];
      if (!model.capabilities.includes('image')) {
        const errorMessage = `⚠️ مدل انتخاب شده (${model.name}) قابلیت تحلیل تصویر را ندارد. لطفاً با دستور /model یک مدل دیگر انتخاب کنید یا با دستور /models لیست مدل‌های قابل انتخاب را ببینید.`;
        bot.sendMessage(chatId, errorMessage);
        return;
      }
      
      if (msg.caption) {
        messageText = msg.caption;
      } else {
        messageText = 'لطفاً این تصویر را تحلیل کنید.';
      }
    } else if (msg.voice) {
      bot.sendMessage(chatId, 'در این نسخه از ربات، پردازش پیام‌های صوتی پشتیبانی نمی‌شود.');
      return;
    } else if (msg.document) {
      bot.sendMessage(chatId, 'در این نسخه از ربات، پردازش اسناد پشتیبانی نمی‌شود.');
      return;
    } else if (msg.text && msg.text.startsWith('/')) {
      // دستورات رسیدگی می‌شوند در بخش‌های دیگر
      return;
    } else {
      bot.sendMessage(chatId, 'این نوع پیام پشتیبانی نمی‌شود.');
      return;
    }
    
    if (!messageText && messageType === 'text') {
      return;
    }
    
    bot.sendChatAction(chatId, 'typing');
    
    // ایجاد تاریخچه چت اگر وجود نداشته باشد
    if (!userChats[userId]) {
      userChats[userId] = [];
    }
    
    // تهیه پیام برای ارسال به API
    const messageToSend = {
      role: 'user',
      content: messageType === 'image' ? [
        {
          type: 'text',
          text: messageText
        },
        {
          type: 'image_url',
          image_url: {
            url: `data:image/jpeg;base64,${imageBase64}`
          }
        }
      ] : messageText
    };
    
    userChats[userId].push(messageToSend);
    
    // محدود کردن تاریخچه چت به 20 پیام آخر
    if (userChats[userId].length > 20) {
      userChats[userId] = userChats[userId].slice(-20);
    }
    
    // اضافه کردن پیام سیستم
    const systemMessage = {
      role: 'system',
      content: getSystemPrompt()
    };
    
    const messages = [systemMessage, ...userChats[userId]];
    
    // دریافت پاسخ از API
    const aiResponse = await getAIResponse(messages, settings.model);
    
    let finalResponse = aiResponse;
    
    // ترجمه پاسخ در صورت فعال بودن ترجمه خودکار
    if (settings.autoTranslate && settings.preferredLanguage !== 'fa') {
      finalResponse = await translateText(aiResponse, settings.preferredLanguage);
    }
    
    // اضافه کردن پاسخ به تاریخچه چت
    userChats[userId].push({
      role: 'assistant',
      content: aiResponse
    });
    
    // ارسال پاسخ به کاربر
    bot.sendMessage(chatId, finalResponse);
    
  } catch (error) {
    console.error('خطا در پردازش پیام:', error);
    try {
      bot.sendMessage(msg.chat.id, 'مشکلی در پردازش پیام شما پیش آمد. لطفاً بعداً دوباره تلاش کنید.');
    } catch (sendError) {
      console.error('خطا در ارسال پیام خطا:', sendError);
    }
  }
});

// دستور start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  initUserSettings(userId);
  
  const welcomeMessage = `
🌟 به دستیار هوش مصنوعی من خوش آمدید! 🌟

من اینجا هستم تا به شما در انجام کارهای مختلف کمک کنم. کافیست سؤال خود را بپرسید تا به شما پاسخ دهم.

🔹 برای دیدن لیست قابلیت‌ها: /help
🔹 برای تغییر مدل هوش مصنوعی: /models
🔹 برای تنظیم زبان پاسخ‌ها: /language
🔹 برای پاک کردن تاریخچه گفتگو: /clear

مدل فعلی: ${availableModels[userSettings[userId].model].emoji} ${availableModels[userSettings[userId].model].name}
`;
  
  bot.sendMessage(chatId, welcomeMessage);
});

// دستور help
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const settings = initUserSettings(userId);
  
  const helpMessage = `
📚 راهنمای استفاده از دستیار هوش مصنوعی من:

🤖 *قابلیت‌های اصلی*:
• پاسخ به سؤالات عمومی و تخصصی
• کمک به نوشتن متن‌ها و محتوا
• تحلیل اطلاعات و داده‌ها
• کمک به حل مسائل ریاضی و منطقی
• ترجمه متون و اصطلاحات
• ارائه ایده و خلاقیت
• کدنویسی و عیب‌یابی کد

📱 *دستورات ربات*:
/start - شروع مجدد ربات
/help - نمایش این راهنما
/models - انتخاب مدل هوش مصنوعی
/model - نمایش مدل فعلی
/clear - پاک کردن تاریخچه گفتگو
/language - تنظیم زبان پاسخ‌ها
/translate_on - فعال‌سازی ترجمه خودکار
/translate_off - غیرفعال‌سازی ترجمه خودکار

📷 *قابلیت تحلیل تصویر*:
مدل فعلی ${settings.model === 'gemini-2.5-pro' ? 'می‌تواند' : 'نمی‌تواند'} تصاویر را تحلیل کند.
برای تحلیل تصویر باید از مدل ${availableModels['gemini-2.5-pro'].emoji} ${availableModels['gemini-2.5-pro'].name} استفاده کنید.

مدل فعلی: ${availableModels[settings.model].emoji} ${availableModels[settings.model].name}
`;
  
  bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
});

// دستور models
bot.onText(/\/models/, (msg) => {
  const chatId = msg.chat.id;
  
  let modelsMessage = '📋 لیست مدل‌های هوش مصنوعی من:\n\n';
  
  // ایجاد دکمه‌های انتخاب مدل
  const inlineKeyboard = [];
  const modelKeys = Object.keys(availableModels);
  
  // ایجاد ردیف‌های دکمه (هر ردیف 2 دکمه)
  for (let i = 0; i < modelKeys.length; i += 2) {
    const row = [];
    row.push({
      text: `${availableModels[modelKeys[i]].emoji} ${availableModels[modelKeys[i]].name}`,
      callback_data: `model_${modelKeys[i]}`
    });
    
    if (i + 1 < modelKeys.length) {
      row.push({
        text: `${availableModels[modelKeys[i+1]].emoji} ${availableModels[modelKeys[i+1]].name}`,
        callback_data: `model_${modelKeys[i+1]}`
      });
    }
    
    inlineKeyboard.push(row);
  }
  
  // ایجاد توضیحات مدل‌ها
  Object.keys(availableModels).forEach(key => {
    const model = availableModels[key];
    modelsMessage += `${model.emoji} *${model.name}*\n${model.description}\n`;
    modelsMessage += `قابلیت‌ها: ${model.capabilities.includes('image') ? '✓ تحلیل تصویر, ' : ''}✓ متن\n\n`;
  });
  
  modelsMessage += '\nبرای انتخاب هر مدل، روی دکمه مربوطه کلیک کنید.';
  
  const options = {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: inlineKeyboard
    }
  };
  
  bot.sendMessage(chatId, modelsMessage, options);
});

// دستور model
bot.onText(/\/model/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const settings = initUserSettings(userId);
  
  const model = availableModels[settings.model];
  
  const modelMessage = `
🤖 *مدل فعلی*: ${model.emoji} *${model.name}*

توضیحات: ${model.description}

قابلیت‌ها: ${model.capabilities.includes('image') ? '✓ تحلیل تصویر, ' : ''}✓ متن

برای تغییر مدل از دستور /models استفاده کنید.
  `;
  
  bot.sendMessage(chatId, modelMessage, { parse_mode: 'Markdown' });
});

// دستور clear
bot.onText(/\/clear/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  userChats[userId] = [];
  
  const clearMessage = '🗑️ تاریخچه گفتگوی شما پاک شد. می‌توانید گفتگوی جدیدی را شروع کنید.';
  bot.sendMessage(chatId, clearMessage);
});

// دستور language
bot.onText(/\/language/, (msg) => {
  const chatId = msg.chat.id;
  
  const languageOptions = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🇮🇷 فارسی', callback_data: 'lang_fa' },
          { text: '🇬🇧 انگلیسی', callback_data: 'lang_en' }
        ],
        [
          { text: '🇫🇷 فرانسوی', callback_data: 'lang_fr' },
          { text: '🇩🇪 آلمانی', callback_data: 'lang_de' }
        ],
        [
          { text: '🇪🇸 اسپانیایی', callback_data: 'lang_es' },
          { text: '🇷🇺 روسی', callback_data: 'lang_ru' }
        ],
        [
          { text: '🇨🇳 چینی', callback_data: 'lang_zh' },
          { text: '🇯🇵 ژاپنی', callback_data: 'lang_ja' }
        ],
        [
          { text: '🇸🇦 عربی', callback_data: 'lang_ar' },
          { text: '🇹🇷 ترکی', callback_data: 'lang_tr' }
        ]
      ]
    }
  };
  
  bot.sendMessage(chatId, '🌐 لطفاً زبان مورد نظر خود را انتخاب کنید:', languageOptions);
});

// پردازش callback_query
bot.on('callback_query', async (callbackQuery) => {
  const action = callbackQuery.data;
  const msg = callbackQuery.message;
  const userId = callbackQuery.from.id;
  const chatId = msg.chat.id;
  const settings = initUserSettings(userId);
  
  // پردازش انتخاب زبان
  if (action.startsWith('lang_')) {
    const langCode = action.split('_')[1];
    settings.preferredLanguage = langCode;
    
    let languageName;
    switch (langCode) {
      case 'fa': languageName = 'فارسی'; break;
      case 'en': languageName = 'انگلیسی'; break;
      case 'fr': languageName = 'فرانسوی'; break;
      case 'de': languageName = 'آلمانی'; break;
      case 'es': languageName = 'اسپانیایی'; break;
      case 'ru': languageName = 'روسی'; break;
      case 'zh': languageName = 'چینی'; break;
      case 'ja': languageName = 'ژاپنی'; break;
      case 'ar': languageName = 'عربی'; break;
      case 'tr': languageName = 'ترکی'; break;
      default: languageName = 'نامشخص';
    }
    
    // فعال کردن ترجمه خودکار فقط در صورت تغییر زبان
    if (langCode !== 'fa') {
      settings.autoTranslate = true;
      bot.sendMessage(chatId, `✅ زبان ${languageName} انتخاب شد و ترجمه خودکار فعال شد.`);
    } else {
      settings.autoTranslate = false;
      bot.sendMessage(chatId, `✅ زبان ${languageName} انتخاب شد.`);
    }
    
    bot.answerCallbackQuery(callbackQuery.id);
  }
  // پردازش انتخاب مدل
  else if (action.startsWith('model_')) {
    const modelKey = action.split('_')[1];
    if (availableModels[modelKey]) {
      settings.model = modelKey;
      const model = availableModels[modelKey];
      
      const confirmMessage = `✅ مدل ${model.emoji} *${model.name}* انتخاب شد.\n\n${model.description}\n\nقابلیت‌ها: ${model.capabilities.includes('image') ? '✓ تحلیل تصویر, ' : ''}✓ متن`;
      
      bot.sendMessage(chatId, confirmMessage, { parse_mode: 'Markdown' });
      bot.answerCallbackQuery(callbackQuery.id);
    }
  }
});

// دستور translate_on
bot.onText(/\/translate_on/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const settings = initUserSettings(userId);
  
  settings.autoTranslate = true;
  
  let languageName;
  switch (settings.preferredLanguage) {
    case 'fa': languageName = 'فارسی'; break;
    case 'en': languageName = 'انگلیسی'; break;
    case 'fr': languageName = 'فرانسوی'; break;
    case 'de': languageName = 'آلمانی'; break;
    case 'es': languageName = 'اسپانیایی'; break;
    case 'ru': languageName = 'روسی'; break;
    case 'zh': languageName = 'چینی'; break;
    case 'ja': languageName = 'ژاپنی'; break;
    case 'ar': languageName = 'عربی'; break;
    case 'tr': languageName = 'ترکی'; break;
    default: languageName = 'نامشخص';
  }
  
  bot.sendMessage(chatId, `✅ ترجمه خودکار فعال شد. پاسخ‌ها به زبان ${languageName} ترجمه خواهند شد.`);
});

// دستور translate_off
bot.onText(/\/translate_off/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const settings = initUserSettings(userId);
  
  settings.autoTranslate = false;
  bot.sendMessage(chatId, '❌ ترجمه خودکار غیرفعال شد. پاسخ‌ها به زبان اصلی (فارسی) ارائه خواهند شد.');
});

// گوش دادن به خطاها
bot.on('polling_error', (error) => {
  console.error('خطای پُلینگ:', error);
});

console.log('ربات من در حال اجرا است...');

// اضافه کردن یک روش برای خروج بهتر
process.on('SIGINT', () => {
  console.log('خروج از برنامه...');
  bot.stopPolling();
  process.exit(0);
});
