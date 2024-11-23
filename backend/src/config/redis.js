const Redis = require('ioredis');

const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,

    // Max Connections
    maxRetriesPerRequest: 3,        // Số lần retry tối đa cho mỗi request
    maxLoadingRetryTime: 10000,     // Thời gian tối đa retry khi loading (ms)

    // Connection Timeout
    connectTimeout: 10000,          // Timeout khi connecting (ms)
    commandTimeout: 5000,           // Timeout cho mỗi command (ms)

    // Retry Strategy
    retryStrategy(times) {
        const delay = Math.min(times * 50, 2000); // Exponential backoff
        return delay;
    },

    // Keep-alive Settings
    //keepAlive: 10000,              // Gửi keep-alive packet mỗi 10s
    noDelay: true,                 // Disable Nagle's algorithm
    connectionName: 'url-shortener',// Đặt tên cho connection

    // Reconnect Settings
    reconnectOnError(err) {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
            // Chỉ reconnect cho một số lỗi cụ thể
            return true;
        }
        return false;
    },

    // Connection Events
    enableReadyCheck: true,        // Kiểm tra Redis ready state
    enableOfflineQueue: true,      // Queue commands khi offline

    // Pool Settings
    db: 0,                         // Database index
    maxConnections: 30,            // Số connections tối đa trong pool
    minConnections: 5,             // Số connections tối thiểu trong pool


    maxmemory: '100mb',             // Cấu hình giới hạn bộ nhớ tối đa
    maxmemory_policy: 'volatile-lru' // Cấu hình chính sách thay thế dữ liệu
};

// Error handling
const handleRedisError = (err) => {
    console.error('Redis Error:', err);
};

const redis = new Redis(redisConfig);

redis.on('error', handleRedisError);
redis.on('connect', () => console.log('Redis connected'));
redis.on('ready', () => console.log('Redis ready'));
redis.on('close', () => console.log('Redis connection closed'));
redis.on('reconnecting', () => console.log('Redis reconnecting'));
// const Redis = require('ioredis');

// const redis = new Redis({
//     host: process.env.REDIS_HOST || 'localhost',
//     port: process.env.REDIS_PORT || 6379,
//     password: process.env.REDIS_PASSWORD,
// });

// redis.on('connect', () => {
//     console.log('Redis connected');
// });

// redis.on('error', (error) => {
//     console.error('Redis connection error:', error);
// });

// module.exports = redis;

// const Redis = require('ioredis');

// const redis = new Redis({
//     host: process.env.REDIS_HOST || 'localhost',
//     port: process.env.REDIS_PORT || 6379,
//     password: process.env.REDIS_PASSWORD,
//     // Thêm các cấu hình khác nếu cần
// });

// module.exports = redis;


// Thêm publisher function
redis.publishCacheUpdate = async (data) => {
    try {
        await redis.publish('cache-updates', JSON.stringify(data));
    } catch (error) {
        console.error('Redis publish error:', error);
    }
};

module.exports = redis;

