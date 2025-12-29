/**
 * Telegram notification utility
 * Sends messages to configured Telegram channel for admin alerts
 */

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHANNEL = process.env.TELEGRAM_CHANNEL;

const RATE_LIMIT_MS = 5000;
let lastSentTime = 0;
type ParseMode = 'Markdown' | 'HTML' | 'none';
const messageQueue: Array<{ message: string; parseMode: ParseMode }> = [];

/**
 * Escape special characters for Telegram HTML format
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Escape special characters for Telegram Markdown format
 * Matches the escaping pattern from log-monitor-telegram.js
 */
function escapeMarkdown(text: string): string {
  return text
    .replace(/`/g, '\\`')
    .replace(/\*/g, '\\*')
    .replace(/_/g, '\\_')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]');
}

/**
 * Send a message to Telegram channel
 * @param message - Message text (should already be properly formatted for the parse mode)
 * @param parseMode - Parse mode: 'HTML', 'Markdown', or 'none' (default: 'HTML')
 * @returns Promise that resolves when message is sent (or queued)
 */
export async function sendTelegramNotification(
  message: string,
  parseMode: ParseMode = 'HTML'
): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHANNEL) {
    console.warn('⚠️ Telegram credentials not configured, skipping notification');
    return;
  }

  const now = Date.now();
  const timeSinceLastMessage = now - lastSentTime;

  // Queue message if rate limit not met
  if (timeSinceLastMessage < RATE_LIMIT_MS) {
    messageQueue.push({ message, parseMode });
    // Process queue after rate limit
    setTimeout(processQueue, RATE_LIMIT_MS - timeSinceLastMessage);
    return;
  }

  // Send immediately
  await sendMessage(message, parseMode);
  lastSentTime = Date.now();

  // Process any queued messages
  if (messageQueue.length > 0) {
    setTimeout(processQueue, RATE_LIMIT_MS);
  }
}

/**
 * Process queued messages
 */
async function processQueue(): Promise<void> {
  if (messageQueue.length === 0) return;

  const { message, parseMode } = messageQueue.shift()!;
  await sendMessage(message, parseMode);
  lastSentTime = Date.now();

  // Process next message if any
  if (messageQueue.length > 0) {
    setTimeout(processQueue, RATE_LIMIT_MS);
  }
}

/**
 * Actually send the message to Telegram API
 */
async function sendMessage(message: string, parseMode: ParseMode): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHANNEL) {
    return;
  }

  const chatId = TELEGRAM_CHANNEL.startsWith('@')
    ? TELEGRAM_CHANNEL
    : TELEGRAM_CHANNEL;

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

  const payload = JSON.stringify({
    chat_id: chatId,
    text: message,
    parse_mode: parseMode === 'none' ? undefined : parseMode,
    disable_web_page_preview: true,
  });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: payload,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to send Telegram message:', errorText);
    } else {
      console.log('✅ Telegram notification sent');
    }
  } catch (error: any) {
    // Silently fail - notifications should not break the app
    console.error('❌ Telegram API error:', error.message);
  }
}
