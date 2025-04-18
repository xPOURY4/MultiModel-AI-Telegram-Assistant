# MultiModel AI Telegram Assistant

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-14+-339933?style=for-the-badge&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/OpenRouter-Powered-FF0000?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Telegram-Bot-26A5E4?style=for-the-badge&logo=telegram&logoColor=white" />
</p>

**English** | [فارسی](ربات-تلگرام-هوش-مصنوعی)

A powerful Telegram bot that uses various AI models through OpenRouter API to provide an intelligent chat assistant. The bot can handle multiple language models, process text and images, and provide translations.

## Features

- 🤖 Access to multiple AI models through OpenRouter API
- 🌍 Support for translation into 10 different languages
- 📷 Image analysis capabilities (with Gemini model)
- 💬 Chat history management
- 🔄 Easy model switching with inline buttons
- 🛠️ Customizable user settings

## Available Models

| Model | Name | Capabilities |
|-------|------|--------------|
| 🌟 Gemini 2.5 Pro |  Advanced | Text, Image |
| 🚀 Llama 4 Scout |  Standard | Text |
| ⚡ Nemotron Ultra |  Ultra | Text |
| 💪 Nemotron 70B |  Strong | Text |
| ⚡ Mistral Small |  Fast | Text |
| 🔍 DeepSeek R1 |  Deep | Text |
| 💻 DeepCoder |  Coder | Text |
| 🇨🇳 Qwen 32B |  China | Text |
| 🌙 Moonlight |  Moonlight | Text |

## Prerequisites

- Node.js 14.0 or higher
- An OpenRouter API key
- A Telegram bot token
- (Optional) A Google Gemini API key
- (Optional) Google Cloud Translate API credentials

## Getting Started

### Step 1: Create a Telegram Bot

1. Open Telegram and search for `@BotFather`
2. Start a chat with BotFather and send `/newbot`
3. Follow the instructions to create a new bot
4. Once created, BotFather will give you a **token** for your bot. Save this token.

### Step 2: Get an OpenRouter API Key

1. Go to [OpenRouter](https://openrouter.ai/) and create an account
2. Navigate to the API section and create a new API key
3. Copy your API key

### Step 3: (Optional) Get a Google Gemini API Key

1. Go to [Google AI Studio](https://ai.google.dev/)
2. Create an account if you don't have one
3. Navigate to the API keys section and create a new API key
4. Copy your API key

### Step 4: Clone the Repository

```bash
git clone https://github.com/xPOURY4/MultiModel-AI-Telegram-Assistant.git
cd MultiModel-AI-Telegram-Assistant
```

### Step 5: Install Dependencies

```bash
npm install
```

### Step 6: Configure Environment Variables

Create a `.env` file in the project root with the following content:

```
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
OPENROUTER_API_KEY=your_openrouter_api_key
GEMINI_API_KEY=your_gemini_api_key
SITE_URL=your_website_url
SITE_NAME=MyAi AI
```

### Step 7: Run the Bot

```bash
npm start
```

## Bot Commands

- `/start` - Start the bot
- `/help` - Show help information
- `/models` - Show and select available AI models
- `/model` - Show the current model
- `/clear` - Clear chat history
- `/language` - Change the response language
- `/translate_on` - Enable automatic translation
- `/translate_off` - Disable automatic translation

## Deployment

### Running on a Linux Server

1. Connect to your server via SSH:
```bash
ssh username@your_server_ip
```

2. Install Node.js:
```bash
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt-get install -y nodejs
```

3. Set up a process manager like PM2:
```bash
sudo npm install pm2 -g
```

4. Clone and set up the bot as described above

5. Start the bot with PM2:
```bash
pm2 start bot.js --name myai-bot
pm2 save
pm2 startup
```

## License

MIT License

---

<div dir="rtl">

# ربات تلگرام هوش مصنوعی 

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-14+-339933?style=for-the-badge&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/OpenRouter-Powered-FF0000?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Telegram-Bot-26A5E4?style=for-the-badge&logo=telegram&logoColor=white" />
</p>

[English](#MultiModel-AI-Telegram-Assistant) | **فارسی**

یک ربات تلگرام قدرتمند که با استفاده از مدل‌های مختلف هوش مصنوعی از طریق API OpenRouter، یک دستیار چت هوشمند ارائه می‌دهد. این ربات می‌تواند با مدل‌های زبانی متعدد کار کند، متن و تصاویر را پردازش کند و ترجمه ارائه دهد.

## قابلیت‌ها

- 🤖 دسترسی به چندین مدل هوش مصنوعی از طریق API OpenRouter
- 🌍 پشتیبانی از ترجمه به ۱۰ زبان مختلف
- 📷 قابلیت تحلیل تصویر (با مدل Gemini)
- 💬 مدیریت تاریخچه گفتگو
- 🔄 تغییر آسان مدل با دکمه‌های درون‌خطی
- 🛠️ تنظیمات قابل شخصی‌سازی کاربر

## مدل‌های موجود

| مدل | نام | قابلیت‌ها |
|-----|-----|----------|
| 🌟 Gemini 2.5 Pro |  پیشرفته | متن، تصویر |
| 🚀 Llama 4 Scout |  استاندارد | متن |
| ⚡ Nemotron Ultra |  اولترا | متن |
| 💪 Nemotron 70B |  قوی | متن |
| ⚡ Mistral Small |  سریع | متن |
| 🔍 DeepSeek R1 | ‌ عمیق | متن |
| 💻 DeepCoder | ‌ کدنویس | متن |
| 🇨🇳 Qwen 32B |  چین | متن |
| 🌙 Moonlight |  مهتاب | متن |

## پیش‌نیازها

- Node.js 14.0 یا بالاتر
- کلید API OpenRouter
- توکن ربات تلگرام
- (اختیاری) کلید API Google Gemini
- (اختیاری) اعتبارنامه API Google Cloud Translate

## شروع به کار

### مرحله ۱: ساخت ربات تلگرام

1. تلگرام را باز کنید و برای `@BotFather` جستجو کنید
2. با BotFather چت را شروع کنید و دستور `/newbot` را ارسال کنید
3. دستورالعمل‌ها را برای ایجاد ربات جدید دنبال کنید
4. پس از ایجاد، BotFather یک **توکن** برای ربات شما ارائه می‌دهد. این توکن را ذخیره کنید.

### مرحله ۲: دریافت کلید API OpenRouter

1. به [OpenRouter](https://openrouter.ai/) بروید و یک حساب کاربری ایجاد کنید
2. به بخش API بروید و یک کلید API جدید ایجاد کنید
3. کلید API خود را کپی کنید

### مرحله ۳: (اختیاری) دریافت کلید API Google Gemini

1. به [Google AI Studio](https://ai.google.dev/) بروید
2. اگر حساب کاربری ندارید، یک حساب ایجاد کنید
3. به بخش کلیدهای API بروید و یک کلید API جدید ایجاد کنید
4. کلید API خود را کپی کنید

### مرحله ۴: کلون کردن مخزن

```bash
git clone https://github.com/xPOURY4/MultiModel-AI-Telegram-Assistant.git
cd MultiModel-AI-Telegram-Assistant
```

### مرحله ۵: نصب وابستگی‌ها

```bash
npm install
```

### مرحله ۶: پیکربندی متغیرهای محیطی

یک فایل `.env` در ریشه پروژه با محتوای زیر ایجاد کنید:

```
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
OPENROUTER_API_KEY=your_openrouter_api_key
GEMINI_API_KEY=your_gemini_api_key
SITE_URL=your_website_url
SITE_NAME=MyAi AI
```

### مرحله ۷: اجرای ربات

```bash
npm start
```

## دستورات ربات

- `/start` - شروع ربات
- `/help` - نمایش اطلاعات راهنما
- `/models` - نمایش و انتخاب مدل‌های هوش مصنوعی موجود
- `/model` - نمایش مدل فعلی
- `/clear` - پاک کردن تاریخچه گفتگو
- `/language` - تغییر زبان پاسخ
- `/translate_on` - فعال‌سازی ترجمه خودکار
- `/translate_off` - غیرفعال‌سازی ترجمه خودکار

## استقرار

### اجرا روی سرور لینوکس

1. از طریق SSH به سرور خود متصل شوید:
```bash
ssh username@your_server_ip
```

2. Node.js را نصب کنید:
```bash
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt-get install -y nodejs
```

3. یک مدیر فرآیند مانند PM2 راه‌اندازی کنید:
```bash
sudo npm install pm2 -g
```

4. ربات را همانطور که در بالا توضیح داده شد، کلون و راه‌اندازی کنید

5. ربات را با PM2 شروع کنید:
```bash
pm2 start bot.js --name MyAi-bot
pm2 save
pm2 startup
```

## مجوز

مجوز MIT

</div>
