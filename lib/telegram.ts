/**
 * Telegram notification utility
 * Sends messages to configured Telegram channel for admin alerts
 */

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHANNEL = process.env.TELEGRAM_CHANNEL;

const RATE_LIMIT_MS = 5000;
let lastSentTime = 0;
const messageQueue: Array<{ message: string; isMarkdown: boolean }> = [];

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
 * @param message - Message text (will be escaped if isMarkdown is true)
 * @param isMarkdown - Whether to parse as Markdown (default: true)
 * @returns Promise that resolves when message is sent (or queued)
 */
export async function sendTelegramNotification(
  message: string,
  isMarkdown: boolean = true
): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHANNEL) {
    console.warn('⚠️ Telegram credentials not configured, skipping notification');
    return;
  }

  const now = Date.now();
  const timeSinceLastMessage = now - lastSentTime;

  // Queue message if rate limit not met
  if (timeSinceLastMessage < RATE_LIMIT_MS) {
    messageQueue.push({ message, isMarkdown });
    // Process queue after rate limit
    setTimeout(processQueue, RATE_LIMIT_MS - timeSinceLastMessage);
    return;
  }

  // Send immediately
  await sendMessage(message, isMarkdown);
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

  const { message, isMarkdown } = messageQueue.shift()!;
  await sendMessage(message, isMarkdown);
  lastSentTime = Date.now();

  // Process next message if any
  if (messageQueue.length > 0) {
    setTimeout(processQueue, RATE_LIMIT_MS);
  }
}

/**
 * Actually send the message to Telegram API
 */
async function sendMessage(message: string, isMarkdown: boolean): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHANNEL) {
    return;
  }

  const chatId = TELEGRAM_CHANNEL.startsWith('@')
    ? TELEGRAM_CHANNEL
    : TELEGRAM_CHANNEL;

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  // If isMarkdown is false, escape the entire message (for plain text)
  // If isMarkdown is true, message should already have properly escaped user content
  const text = isMarkdown ? message : escapeMarkdown(message);

  const payload = JSON.stringify({
    chat_id: chatId,
    text: text,
    parse_mode: isMarkdown ? 'Markdown' : undefined,
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
