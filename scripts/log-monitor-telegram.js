const { spawn } = require('child_process');
const https = require('https');

// Configuration
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHANNEL = process.env.TELEGRAM_CHANNEL; // Can be @channel_name or chat_id
const CONTAINER_NAME = process.env.CONTAINER_NAME || 'cosmos-ai';
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

function sendTelegramMessage(message) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHANNEL) {
        console.error('❌ Telegram credentials not configured!');
        return;
    }

    const now = Date.now();
    const timeSinceLastMessage = now - lastSentTime;

    if (timeSinceLastMessage < RATE_LIMIT_MS) {
        messageQueue.push(message);
        return;
    }

    // Support both channel username (@channel) and chat ID
    const chatId = TELEGRAM_CHANNEL.startsWith('@')
        ? TELEGRAM_CHANNEL
        : TELEGRAM_CHANNEL;

    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const data = JSON.stringify({
        chat_id: chatId,
        text: `🚨 *Cosmos-AI Error Alert*\n\n\`\`\`\n${message}\n\`\`\``,
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
                            sendTelegramMessage(queuedMessage);
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

