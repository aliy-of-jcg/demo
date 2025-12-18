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
    : `🚨 *Cosmos-AI Error Alert*\n\n\`\`\`\n${message}\n\`\`\``;

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

async function getClickHouseStorage() {
  try {
    // Query analytics database size
    const analyticsQuery = `SELECT formatReadableSize(sum(bytes_on_disk)) AS size FROM system.parts WHERE database = 'analytics' AND active = 1 FORMAT JSON`;
    let analyticsSize = '0 B';
    try {
      const { stdout: analyticsStdout } = await execAsync(`docker exec ${CLICKHOUSE_CONTAINER} clickhouse-client --query "${analyticsQuery}"`);
      const analyticsResult = JSON.parse(analyticsStdout);
      if (analyticsResult && analyticsResult.length > 0 && analyticsResult[0].size) {
        analyticsSize = analyticsResult[0].size;
      }
    } catch (e) {
      console.error('Error querying analytics:', e.message);
    }

    // Query system database size
    const systemQuery = `SELECT formatReadableSize(sum(bytes_on_disk)) AS size FROM system.parts WHERE database = 'system' AND active = 1 FORMAT JSON`;
    let systemSize = '0 B';
    try {
      const { stdout: systemStdout } = await execAsync(`docker exec ${CLICKHOUSE_CONTAINER} clickhouse-client --query "${systemQuery}"`);
      const systemResult = JSON.parse(systemStdout);
      if (systemResult && systemResult.length > 0 && systemResult[0].size) {
        systemSize = systemResult[0].size;
      }
    } catch (e) {
      console.error('Error querying system:', e.message);
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

const dockerLogs = spawn('docker', ['logs', '-f', '--tail', '0', CONTAINER_NAME], {
  stdio: ['ignore', 'pipe', 'pipe']
});

let buffer = '';

dockerLogs.stdout.on('data', (data) => {
  buffer += data.toString();
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';

  lines.forEach(line => {
    if (line.trim() && containsKeyword(line)) {
      const timestamp = new Date().toISOString();
      const message = `[${timestamp}] ${line}`;
      console.log('⚠️  Error detected:', line.substring(0, 100) + '...');
      sendTelegramMessage(truncateMessage(message));
    }
  });
});

dockerLogs.stderr.on('data', (data) => {
  buffer += data.toString();
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';

  lines.forEach(line => {
    if (line.trim() && containsKeyword(line)) {
      const timestamp = new Date().toISOString();
      const message = `[${timestamp}] [STDERR] ${line}`;
      console.log('⚠️  Error detected (stderr):', line.substring(0, 100) + '...');
      sendTelegramMessage(truncateMessage(message));
    }
  });
});

dockerLogs.on('error', (error) => {
  console.error('❌ Docker logs error:', error.message);
  sendTelegramMessage(`❌ Log monitor error: ${error.message}`);
  process.exit(1);
});

dockerLogs.on('close', (code) => {
  console.log(`⚠️  Docker logs process exited with code ${code}`);
  sendTelegramMessage(`⚠️  Log monitor stopped (exit code: ${code})`);
  process.exit(code);
});

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
