const { spawn, exec } = require('child_process');
const https = require('https');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Configuration
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHANNEL = process.env.TELEGRAM_CHANNEL; // Can be @channel_name or chat_id
const CONTAINER_NAME = process.env.CONTAINER_NAME || 'cosmos-ai';
const CLICKHOUSE_CONTAINER = process.env.CLICKHOUSE_CONTAINER || 'clickhouse-analytics';
const KEYWORDS = [
  'error', 'Error', 'ERROR',
  'typeerror', 'TypeError', 'TYPEERROR',
  'undefined', 'Undefined', 'UNDEFINED',
  'exception', 'Exception', 'EXCEPTION',
  'fatal', 'Fatal', 'FATAL',
  'failed', 'Failed', 'FAILED',
  'cannot', 'Cannot', 'CANNOT',
  'uncaught', 'Uncaught', 'UNCAUGHT'
];

const RATE_LIMIT_MS = 5000;
const messageQueue = [];
let lastSentTime = 0;
let lastUpdateId = 0;
const recentErrors = new Map(); // hash -> timestamp
const ERROR_DEDUP_TTL_MS = 60000; // 60 seconds

function sendTelegramMessage(message, isCommandResponse = false) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHANNEL) {
    console.error('❌ Telegram credentials not configured!');
    return;
  }

  const now = Date.now();
  const timeSinceLastMessage = now - lastSentTime;

  if (timeSinceLastMessage < RATE_LIMIT_MS && !isCommandResponse) {
    messageQueue.push({ message, isCommandResponse });
    return;
  }

  // Support both channel username (@channel) and chat ID
  const chatId = TELEGRAM_CHANNEL.startsWith('@')
    ? TELEGRAM_CHANNEL
    : TELEGRAM_CHANNEL;

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const text = isCommandResponse
    ? message
    : `🚨 *Cosmos-AI Error Alert*\n\n\`\`\`\n${escapeMarkdown(message)}\n\`\`\``;

  const data = JSON.stringify({
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown',
    disable_web_page_preview: true
  });

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  const req = https.request(url, options, (res) => {
    let responseData = '';
    res.on('data', (chunk) => {
      responseData += chunk;
    });
    res.on('end', () => {
      if (res.statusCode === 200) {
        console.log('✅ Message sent to Telegram');
        lastSentTime = Date.now();
        if (messageQueue.length > 0) {
          setTimeout(() => {
            const queuedMessage = messageQueue.shift();
            if (queuedMessage) {
              sendTelegramMessage(queuedMessage.message, queuedMessage.isCommandResponse);
            }
          }, RATE_LIMIT_MS);
        }
      } else {
        console.error('❌ Failed to send message:', responseData);
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Telegram API error:', error.message);
  });

  req.write(data);
  req.end();
}

function containsKeyword(line) {
  const lowerLine = line.toLowerCase();
  return KEYWORDS.some(keyword => lowerLine.includes(keyword.toLowerCase()));
}

function truncateMessage(message, maxLength = 4000) {
  if (message.length <= maxLength) return message;
  return message.substring(0, maxLength) + '\n\n... (truncated)';
}

function escapeMarkdown(text) {
  return text
    .replace(/`/g, '\\`')
    .replace(/\*/g, '\\*')
    .replace(/_/g, '\\_')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]');
}

function hashMessage(message) {
  // Simple hash function - use first 200 chars as key for deduplication
  return message.substring(0, 200).replace(/\s+/g, ' ').trim();
}

function isDuplicateError(message) {
  const hash = hashMessage(message);
  const now = Date.now();

  // Clean up old entries
  for (const [key, timestamp] of recentErrors.entries()) {
    if (now - timestamp > ERROR_DEDUP_TTL_MS) {
      recentErrors.delete(key);
    }
  }

  // Check if this error was seen recently
  if (recentErrors.has(hash)) {
    return true; // Duplicate within TTL
  }

  // Add to cache
  recentErrors.set(hash, now);
  return false; // Not a duplicate
}

async function getClickHouseStorage() {

  try {
    // Query analytics database size
    const analyticsQuery = `
        SELECT formatReadableSize(sum(bytes_on_disk)) AS size
        FROM system.parts
        WHERE database = 'analytics' AND active = 1
        FORMAT JSON
      `;

    const { stdout: analyticsStdout } = await execAsync(
      `docker exec ${CLICKHOUSE_CONTAINER} clickhouse-client --query "${analyticsQuery}"`
    );
    const analyticsResult = JSON.parse(analyticsStdout);

    let analyticsSize = '0 B';
    if (analyticsResult?.data?.length) {
      analyticsSize = analyticsResult.data[0].size;
    }


    // Query system database size
    const systemQuery = `
        SELECT formatReadableSize(sum(bytes_on_disk)) AS size
        FROM system.parts
        WHERE database = 'system' AND active = 1
        FORMAT JSON
      `;

    const { stdout: systemStdout } = await execAsync(
      `docker exec ${CLICKHOUSE_CONTAINER} clickhouse-client --query "${systemQuery}"`
    );
    const systemResult = JSON.parse(systemStdout);

    let systemSize = '0 B';
    if (systemResult?.data?.length) {
      systemSize = systemResult.data[0].size;
    }

    // Get disk usage
    const { stdout: diskUsage } = await execAsync(`docker exec ${CLICKHOUSE_CONTAINER} df -h /var/lib/clickhouse`);

    let message = '📊 *ClickHouse Storage Status*\n\n*Database Sizes:*\n';
    message += `systemdb size: ${systemSize}\n`;
    message += `analytics size: ${analyticsSize}\n`;

    message += '\n*Disk Usage:*\n';
    message += '```\n' + diskUsage + '\n```';

    return message;
  } catch (error) {
    console.error('Error getting ClickHouse storage:', error.message);
    return `❌ Error getting storage info: ${error.message}`;
  }
}

async function pollTelegramUpdates() {
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?offset=${lastUpdateId + 1}&timeout=10`;

    const response = await new Promise((resolve, reject) => {
      https.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      }).on('error', reject);
    });

    if (response.ok && response.result) {
      for (const update of response.result) {
        lastUpdateId = update.update_id;

        // Check for channel posts
        if (update.channel_post) {
          const text = (update.channel_post.text || '').toLowerCase().trim();

          if (text === 'db' || text === 'db status') {
            console.log('📨 DB status command received');
            const storageInfo = await getClickHouseStorage();
            sendTelegramMessage(storageInfo, true);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error polling Telegram updates:', error.message);
  }
}

console.log(`🔍 Monitoring logs from container: ${CONTAINER_NAME}`);
console.log(`📋 Filtering for keywords: ${KEYWORDS.join(', ')}`);
console.log(`📱 Telegram channel: ${TELEGRAM_CHANNEL}`);

let dockerLogs = null;
let buffer = '';
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY_MS = 5000; // 5 seconds

async function checkContainerExists() {
  try {
    const { stdout } = await execAsync(
      `docker ps --filter name=^${CONTAINER_NAME}$ --format "{{.Names}}"`
    );
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

function startLogMonitoring() {
  if (dockerLogs) {
    dockerLogs.kill();
    dockerLogs = null;
  }

  buffer = '';

  dockerLogs = spawn('docker', ['logs', '-f', '--tail', '0', CONTAINER_NAME], {
    stdio: ['ignore', 'pipe', 'pipe']
  });

  dockerLogs.stdout.on('data', (data) => {
    buffer += data.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    lines.forEach(line => {
      if (line.trim() && containsKeyword(line)) {
        const timestamp = new Date().toISOString();
        const message = `[${timestamp}] ${line}`;

        // Check for duplicates
        if (isDuplicateError(line)) {
          console.log('⚠️  Error detected (duplicate, skipping):', line.substring(0, 100) + '...');
          return;
        }

        console.log('⚠️  Error detected:', line.substring(0, 100) + '...');
        sendTelegramMessage(truncateMessage(message));
      }
    });
  });

  dockerLogs.stderr.on('data', (data) => {
    const errorText = data.toString();

    // Check if it's a "container not found" error
    if (errorText.includes('No such container') || errorText.includes('container not found')) {
      console.log('⚠️  Container not found, will attempt to reconnect...');
      return;
    }

    buffer += errorText;
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    lines.forEach(line => {
      if (line.trim() && containsKeyword(line)) {
        const timestamp = new Date().toISOString();
        const message = `[${timestamp}] [STDERR] ${line}`;

        // Check for duplicates
        if (isDuplicateError(line)) {
          console.log('⚠️  Error detected (stderr, duplicate, skipping):', line.substring(0, 100) + '...');
          return;
        }

        console.log('⚠️  Error detected (stderr):', line.substring(0, 100) + '...');
        sendTelegramMessage(truncateMessage(message));
      }
    });
  });

  dockerLogs.on('error', async (error) => {
    const errorMsg = error.message || '';
    console.error('❌ Docker logs error:', errorMsg);

    // If container not found, attempt reconnect
    if (errorMsg.includes('No such container') || errorMsg.includes('container not found')) {
      await attemptReconnect();
      return;
    }

    // For other errors, send alert but don't exit
    sendTelegramMessage(`❌ Log monitor error: ${errorMsg}`);
  });

  dockerLogs.on('close', async (code) => {
    console.log(`⚠️  Docker logs process exited with code ${code}`);

    // If container was removed/recreated, attempt reconnect
    if (code === 1) {
      await attemptReconnect();
      return;
    }

    // For other exit codes, send alert but attempt reconnect
    sendTelegramMessage(`⚠️  Log monitor disconnected (exit code: ${code}), attempting reconnect...`);
    await attemptReconnect();
  });

  // Send reconnection success message if this was a reconnect
  if (reconnectAttempts > 0) {
    sendTelegramMessage(`✅ Log monitor reconnected successfully to ${CONTAINER_NAME}`, true);
    console.log('✅ Reconnection successful, monitoring resumed');
  } else {
    console.log('✅ Log monitoring started');
  }

  reconnectAttempts = 0; // Reset on successful start
}

async function attemptReconnect() {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.error(`❌ Max reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) reached. Exiting.`);
    sendTelegramMessage(`❌ Log monitor failed to reconnect after ${MAX_RECONNECT_ATTEMPTS} attempts`);
    process.exit(1);
  }

  reconnectAttempts++;
  console.log(`🔄 Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);

  // Wait before reconnecting
  await new Promise(resolve => setTimeout(resolve, RECONNECT_DELAY_MS));

  // Check if container exists
  const containerExists = await checkContainerExists();
  if (!containerExists) {
    console.log('⏳ Container not found, waiting...');
    // Wait longer and try again
    await new Promise(resolve => setTimeout(resolve, RECONNECT_DELAY_MS));
    await attemptReconnect();
    return;
  }

  // Container exists, reconnect
  console.log('✅ Container found, reconnecting...');
  startLogMonitoring();
}

// Start initial monitoring
startLogMonitoring();

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down log monitor...');
  dockerLogs.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down log monitor...');
  dockerLogs.kill();
  process.exit(0);
});

// Start polling for Telegram commands every 5 seconds
setInterval(pollTelegramUpdates, 5000);