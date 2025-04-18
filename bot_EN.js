const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { Translate } = require('@google-cloud/translate').v2;

// Bot settings
const token = process.env.TELEGRAM_BOT_TOKEN || 'YOUR_TELEGRAM_BOT_TOKEN';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || 'YOUR_OPENROUTER_API_KEY';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'YOUR_GEMINI_API_KEY';
const SITE_URL = process.env.SITE_URL || 'YOUR_SITE_URL';
const SITE_NAME = process.env.SITE_NAME || 'My AI';

// Create bot with polling mode
const bot = new TelegramBot(token, { polling: true });
const userChats = {};
const userSettings = {};

// Define supported models
const availableModels = {
  'gemini-2.5-pro': {
    id: 'google/gemini-2.5-pro-exp-03-25:free',
    name: 'Advanced',
    description: 'Powerful assistant with text and image analysis capabilities',
    capabilities: ['text', 'image'],
    emoji: '🌟',
    useDirectAPI: true  // Use Direct Gemini API
  },
  'llama4-scout': {
    id: 'meta-llama/llama-4-scout:free',
    name: 'Standard',
    description: 'High-quality general-purpose assistant',
    capabilities: ['text'],
    emoji: '🚀',
    useDirectAPI: false
  },
  'nemotron-ultra': {
    id: 'nvidia/llama-3.1-nemotron-ultra-253b-v1:free',
    name: 'Ultra',
    description: 'Extremely powerful assistant for complex analyses',
    capabilities: ['text'],
    emoji: '⚡',
    useDirectAPI: false
  },
  'nemotron-70b': {
    id: 'nvidia/llama-3.1-nemotron-70b-instruct:free',
    name: 'Strong',
    description: 'Powerful assistant for everyday conversations',
    capabilities: ['text'],
    emoji: '💪',
    useDirectAPI: false
  },
  'mistral-small': {
    id: 'mistralai/mistral-small-24b-instruct-2501:free',
    name: 'Fast',
    description: 'Fast assistant for quick responses',
    capabilities: ['text'],
    emoji: '⚡',
    useDirectAPI: false
  },
  'deepseek-r1': {
    id: 'deepseek/deepseek-r1-zero:free',
    name: 'Deep',
    description: 'Specialized assistant for in-depth analyses',
    capabilities: ['text'],
    emoji: '🔍',
    useDirectAPI: false
  },
  'deepcoder': {
    id: 'agentica-org/deepcoder-14b-preview:free',
    name: 'Coder',
    description: 'Specialized assistant for coding and programming questions',
    capabilities: ['text'],
    emoji: '💻',
    useDirectAPI: false
  },
  'qwen-32b': {
    id: 'qwen/qwq-32b:free',
    name: 'China',
    description: 'Assistant with expertise in China and Asian topics',
    capabilities: ['text'],
    emoji: '🇨🇳',
    useDirectAPI: false
  },
  'moonlight': {
    id: 'moonshotai/moonlight-16b-a3b-instruct:free',
    name: 'Moonlight',
    description: 'Assistant with high creativity for writing and ideation',
    capabilities: ['text'],
    emoji: '🌙',
    useDirectAPI: false
  }
};

// Default model is llama4-scout
const defaultModelKey = 'llama4-scout';

// Create Google Translate instance if API key is available
let translate;
try {
  translate = new Translate({
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
  });
} catch (error) {
  console.warn('Warning: Google Translate service is not available. Translation feature will be disabled.');
}

// Initialize user settings function
function initUserSettings(userId) {
  if (!userSettings[userId]) {
    userSettings[userId] = {
      model: defaultModelKey,  // Default model is llama4-scout
      autoTranslate: false,    // Auto-translation disabled by default
      preferredLanguage: 'en'  // Default language is English
    };
  }
  return userSettings[userId];
}

// Text translation function
async function translateText(text, targetLanguage) {
  try {
    if (!translate) {
      console.warn('Warning: Translation service is not configured.');
      return text;
    }
    
    const [translation] = await translate.translate(text, targetLanguage);
    return translation;
  } catch (error) {
    console.error('Error translating text:', error);
    return text;
  }
}

// Get response from Gemini API
async function getGeminiResponse(messages) {
  try {
    // Convert messages to Gemini format
    const lastUserMessage = messages.filter(msg => msg.role === 'user').pop();
    let content = [];
    
    if (Array.isArray(lastUserMessage.content)) {
      // Message includes an image
      content = lastUserMessage.content;
    } else {
      // Text-only message
      content = [{ text: lastUserMessage.content }];
    }
    
    const systemMessage = messages.find(msg => msg.role === 'system');
    if (systemMessage) {
      // Add system message as part of the input message
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
      return "I'm sorry, I can't respond right now. Please try again later.";
    }
  } catch (error) {
    console.error('Error getting response from Gemini API:', error.message);
    if (error.response) {
      console.error('API response:', error.response.data);
    }
    return "I'm sorry, I can't respond right now. Please try again later.";
  }
}

// Get response from OpenRouter API
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
    console.error('Error getting response from OpenRouter:', error.message);
    if (error.response) {
      console.error('API response:', error.response.data);
    }
    return "I'm sorry, I can't respond right now. Please try again later.";
  }
}

// Comprehensive function to get response from API
async function getAIResponse(messages, modelKey) {
  const model = availableModels[modelKey] || availableModels[defaultModelKey];
  
  // Use direct API for models that need it
  if (model.useDirectAPI && modelKey === 'gemini-2.5-pro') {
    return await getGeminiResponse(messages);
  } else {
    return await getOpenRouterResponse(messages, modelKey);
  }
}

// Download file from Telegram (for temporary processing without storage)
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

// Get system prompt
function getSystemPrompt() {
  return "You are my AI assistant helping users in English. You should not introduce yourself as a language model. You should respond as my AI assistant. Under no circumstances should you mention that you use OpenRouter or other models. Always introduce yourself only as my assistant.";
}

// Process all messages
bot.on('message', async (msg) => {
  try {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const username = msg.from.username;
    const settings = initUserSettings(userId);
    
    let messageText = '';
    let messageType = 'text';
    let imageBase64 = null;
    
    // Process different types of messages
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
        const errorMessage = `⚠️ The selected model (${model.name}) does not support image analysis. Please use /model to select a different model or use /models to see the list of available models.`;
        bot.sendMessage(chatId, errorMessage);
        return;
      }
      
      if (msg.caption) {
        messageText = msg.caption;
      } else {
        messageText = 'Please analyze this image.';
      }
    } else if (msg.voice) {
      bot.sendMessage(chatId, 'Voice message processing is not supported in this version of the bot.');
      return;
    } else if (msg.document) {
      bot.sendMessage(chatId, 'Document processing is not supported in this version of the bot.');
      return;
    } else if (msg.text && msg.text.startsWith('/')) {
      // Commands are handled in other sections
      return;
    } else {
      bot.sendMessage(chatId, 'This type of message is not supported.');
      return;
    }
    
    if (!messageText && messageType === 'text') {
      return;
    }
    
    bot.sendChatAction(chatId, 'typing');
    
    // Create chat history if it doesn't exist
    if (!userChats[userId]) {
      userChats[userId] = [];
    }
    
    // Prepare message to send to API
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
    
    // Limit chat history to the last 20 messages
    if (userChats[userId].length > 20) {
      userChats[userId] = userChats[userId].slice(-20);
    }
    
    // Add system message
    const systemMessage = {
      role: 'system',
      content: getSystemPrompt()
    };
    
    const messages = [systemMessage, ...userChats[userId]];
    
    // Get response from API
    const aiResponse = await getAIResponse(messages, settings.model);
    
    let finalResponse = aiResponse;
    
    // Translate response if auto-translate is enabled
    if (settings.autoTranslate && settings.preferredLanguage !== 'en') {
      finalResponse = await translateText(aiResponse, settings.preferredLanguage);
    }
    
    // Add response to chat history
    userChats[userId].push({
      role: 'assistant',
      content: aiResponse
    });
    
    // Send response to user
    bot.sendMessage(chatId, finalResponse);
    
  } catch (error) {
    console.error('Error processing message:', error);
    try {
      bot.sendMessage(msg.chat.id, 'There was a problem processing your message. Please try again later.');
    } catch (sendError) {
      console.error('Error sending error message:', sendError);
    }
  }
});

// Start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  initUserSettings(userId);
  
  const welcomeMessage = `
🌟 Welcome to my AI assistant! 🌟

I'm here to help you with various tasks. Just ask your question and I'll respond.

🔹 To see the list of capabilities: /help
🔹 To change the AI model: /models
🔹 To set the response language: /language
🔹 To clear your chat history: /clear

Current model: ${availableModels[userSettings[userId].model].emoji} ${availableModels[userSettings[userId].model].name}
`;
  
  bot.sendMessage(chatId, welcomeMessage);
});

// Help command
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const settings = initUserSettings(userId);
  
  const helpMessage = `
📚 Guide to using my AI assistant:

🤖 *Main Capabilities*:
• Answering general and specialized questions
• Helping write texts and content
• Analyzing information and data
• Helping solve math and logic problems
• Translating texts and terms
• Providing ideas and creativity
• Coding and debugging

📱 *Bot Commands*:
/start - Restart the bot
/help - Display this guide
/models - Select AI model
/model - Show current model
/clear - Clear chat history
/language - Set response language
/translate_on - Enable automatic translation
/translate_off - Disable automatic translation

📷 *Image Analysis Capability*:
Current model ${settings.model === 'gemini-2.5-pro' ? 'can' : 'cannot'} analyze images.
To analyze images, you need to use model ${availableModels['gemini-2.5-pro'].emoji} ${availableModels['gemini-2.5-pro'].name}.

Current model: ${availableModels[settings.model].emoji} ${availableModels[settings.model].name}
`;
  
  bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
});

// Models command
bot.onText(/\/models/, (msg) => {
  const chatId = msg.chat.id;
  
  let modelsMessage = '📋 List of my AI models:\n\n';
  
  // Create model selection buttons
  const inlineKeyboard = [];
  const modelKeys = Object.keys(availableModels);
  
  // Create rows of buttons (2 buttons per row)
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
  
  // Create model descriptions
  Object.keys(availableModels).forEach(key => {
    const model = availableModels[key];
    modelsMessage += `${model.emoji} *${model.name}*\n${model.description}\n`;
    modelsMessage += `Capabilities: ${model.capabilities.includes('image') ? '✓ Image analysis, ' : ''}✓ Text\n\n`;
  });
  
  modelsMessage += '\nTo select a model, click on the corresponding button.';
  
  const options = {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: inlineKeyboard
    }
  };
  
  bot.sendMessage(chatId, modelsMessage, options);
});

// Model command
bot.onText(/\/model/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const settings = initUserSettings(userId);
  
  const model = availableModels[settings.model];
  
  const modelMessage = `
🤖 *Current model*: ${model.emoji} *${model.name}*

Description: ${model.description}

Capabilities: ${model.capabilities.includes('image') ? '✓ Image analysis, ' : ''}✓ Text

To change the model, use /models command.
  `;
  
  bot.sendMessage(chatId, modelMessage, { parse_mode: 'Markdown' });
});

// Clear command
bot.onText(/\/clear/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  userChats[userId] = [];
  
  const clearMessage = '🗑️ Your chat history has been cleared. You can start a new conversation.';
  bot.sendMessage(chatId, clearMessage);
});

// Language command
bot.onText(/\/language/, (msg) => {
  const chatId = msg.chat.id;
  
  const languageOptions = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🇬🇧 English', callback_data: 'lang_en' },
          { text: '🇮🇷 Persian', callback_data: 'lang_fa' }
        ],
        [
          { text: '🇫🇷 French', callback_data: 'lang_fr' },
          { text: '🇩🇪 German', callback_data: 'lang_de' }
        ],
        [
          { text: '🇪🇸 Spanish', callback_data: 'lang_es' },
          { text: '🇷🇺 Russian', callback_data: 'lang_ru' }
        ],
        [
          { text: '🇨🇳 Chinese', callback_data: 'lang_zh' },
          { text: '🇯🇵 Japanese', callback_data: 'lang_ja' }
        ],
        [
          { text: '🇸🇦 Arabic', callback_data: 'lang_ar' },
          { text: '🇹🇷 Turkish', callback_data: 'lang_tr' }
        ]
      ]
    }
  };
  
  bot.sendMessage(chatId, '🌐 Please select your preferred language:', languageOptions);
});

// Process callback_query
bot.on('callback_query', async (callbackQuery) => {
  const action = callbackQuery.data;
  const msg = callbackQuery.message;
  const userId = callbackQuery.from.id;
  const chatId = msg.chat.id;
  const settings = initUserSettings(userId);
  
  // Process language selection
  if (action.startsWith('lang_')) {
    const langCode = action.split('_')[1];
    settings.preferredLanguage = langCode;
    
    let languageName;
    switch (langCode) {
      case 'en': languageName = 'English'; break;
      case 'fa': languageName = 'Persian'; break;
      case 'fr': languageName = 'French'; break;
      case 'de': languageName = 'German'; break;
      case 'es': languageName = 'Spanish'; break;
      case 'ru': languageName = 'Russian'; break;
      case 'zh': languageName = 'Chinese'; break;
      case 'ja': languageName = 'Japanese'; break;
      case 'ar': languageName = 'Arabic'; break;
      case 'tr': languageName = 'Turkish'; break;
      default: languageName = 'Unknown';
    }
    
    // Enable auto-translation only when changing language
    if (langCode !== 'en') {
      settings.autoTranslate = true;
      bot.sendMessage(chatId, `✅ ${languageName} language selected and auto-translation enabled.`);
    } else {
      settings.autoTranslate = false;
      bot.sendMessage(chatId, `✅ ${languageName} language selected.`);
    }
    
    bot.answerCallbackQuery(callbackQuery.id);
  }
  // Process model selection
  else if (action.startsWith('model_')) {
    const modelKey = action.split('_')[1];
    if (availableModels[modelKey]) {
      settings.model = modelKey;
      const model = availableModels[modelKey];
      
      const confirmMessage = `✅ Model ${model.emoji} *${model.name}* selected.\n\n${model.description}\n\nCapabilities: ${model.capabilities.includes('image') ? '✓ Image analysis, ' : ''}✓ Text`;
      
      bot.sendMessage(chatId, confirmMessage, { parse_mode: 'Markdown' });
      bot.answerCallbackQuery(callbackQuery.id);
    }
  }
});

// Translate_on command
bot.onText(/\/translate_on/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const settings = initUserSettings(userId);
  
  settings.autoTranslate = true;
  
  let languageName;
  switch (settings.preferredLanguage) {
    case 'en': languageName = 'English'; break;
    case 'fa': languageName = 'Persian'; break;
    case 'fr': languageName = 'French'; break;
    case 'de': languageName = 'German'; break;
    case 'es': languageName = 'Spanish'; break;
    case 'ru': languageName = 'Russian'; break;
    case 'zh': languageName = 'Chinese'; break;
    case 'ja': languageName = 'Japanese'; break;
    case 'ar': languageName = 'Arabic'; break;
    case 'tr': languageName = 'Turkish'; break;
    default: languageName = 'Unknown';
  }
  
  bot.sendMessage(chatId, `✅ Auto-translation enabled. Responses will be translated to ${languageName}.`);
});

// Translate_off command
bot.onText(/\/translate_off/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const settings = initUserSettings(userId);
  
  settings.autoTranslate = false;
  bot.sendMessage(chatId, '❌ Auto-translation disabled. Responses will be in the original language (English).');
});

// Listen for errors
bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

console.log('My bot is running...');

// Add a better exit method
process.on('SIGINT', () => {
  console.log('Exiting program...');
  bot.stopPolling();
  process.exit(0);
});
