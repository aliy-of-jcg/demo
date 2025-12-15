import Redis from 'ioredis';

// Determine Redis host based on environment
// If REDIS_HOST is 'redis' (Docker hostname) but we're running locally, use 'localhost'
const getRedisHost = (): string => {
    const envHost = process.env.REDIS_HOST || 'localhost';
    
    // If explicitly set to 'redis' (Docker hostname), check if we're in Docker
    // We're likely in Docker if explicitly set via environment variable
    const isInDocker = process.env.DOCKER_CONTAINER === 'true' || 
                       process.env.IN_DOCKER === 'true';
    
    // If host is 'redis' but we're not explicitly in Docker, use localhost for local dev
    // This handles the case where REDIS_HOST=redis is set but app runs locally
    if (envHost === 'redis' && !isInDocker) {
        console.log('⚠️ REDIS_HOST is set to "redis" but not in Docker. Using "localhost" instead.');
        return 'localhost';
    }
    
    return envHost;
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

