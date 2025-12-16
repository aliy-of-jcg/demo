import Redis from 'ioredis';

// Determine Redis host based on environment
// Respect REDIS_HOST environment variable if set, otherwise default to localhost
const getRedisHost = (): string => {
    // If REDIS_HOST is explicitly set, use it (trust the environment)
    // This works for both Docker (REDIS_HOST=redis) and local dev (REDIS_HOST=localhost)
    if (process.env.REDIS_HOST) {
        return process.env.REDIS_HOST;
    }
    
    // Default to localhost if not set (for local development without Docker)
    return 'localhost';
};

// Redis connection configuration
const config = {
    host: getRedisHost(),
    port: parseInt(process.env.REDIS_PORT || '6379'),
    retryStrategy: (times: number) => {
        // Retry with exponential backoff, max 3 seconds
        const delay = Math.min(times * 50, 3000);
        return delay;
    },
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: true, // Connect on first command - allows graceful degradation if Redis is unavailable
};

// Create Redis client instance (singleton)
let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
    if (!redisClient) {
        console.log(`🔌 Connecting to Redis at ${config.host}:${config.port}`);
        redisClient = new Redis(config);

        // Handle connection events
        redisClient.on('connect', () => {
            console.log(`✅ Redis client connected to ${config.host}:${config.port}`);
        });

        redisClient.on('ready', () => {
            console.log('✅ Redis client ready');
        });

        redisClient.on('error', (err) => {
            console.error('❌ Redis client error:', err.message);
        });

        redisClient.on('close', () => {
            console.log('⚠️ Redis client connection closed');
        });

        redisClient.on('reconnecting', () => {
            console.log('🔄 Redis client reconnecting...');
        });
    }
    return redisClient;
}

// Health check function
export async function pingRedis(): Promise<boolean> {
    try {
        const client = getRedisClient();
        const result = await client.ping();
        return result === 'PONG';
    } catch (error) {
        console.error('Redis ping failed:', error);
        return false;
    }
}

// Gracefully close Redis connection
export async function closeRedis(): Promise<void> {
    if (redisClient) {
        await redisClient.quit();
        redisClient = null;
    }
}

