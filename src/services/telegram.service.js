const axios = require('axios');
const env = require('../config/env');
const logger = require('../utils/logger');
const { SiteConfig } = require('../models');

// site_config (row id=1) holds the live bot token/chat id in the legacy app;
// fall back to env vars for local dev so this works before Phase 7 (settings
// UI) lets an admin edit them through the app.
async function getTelegramCreds() {
  const config = await SiteConfig.findByPk(1);
  const botToken = config?.telegramBotToken || env.telegram.botToken;
  const chatId = config?.telegramChatId || env.telegram.chatId;
  return { botToken, chatId };
}

async function sendTelegramMessage(text) {
  const { botToken, chatId } = await getTelegramCreds();
  if (!botToken || !chatId) return false;

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const { status } = await axios.post(
      url,
      { chat_id: chatId, text, parse_mode: 'HTML' },
      { timeout: 10000 }
    );
    return status === 200;
  } catch (err) {
    logger.error('Telegram sendMessage failed', { message: err.message });
    return false;
  }
}

module.exports = { sendTelegramMessage };
