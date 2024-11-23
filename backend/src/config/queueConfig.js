// config/queueConfig.js
const Queue = require('bull');

// Config chung cho Redis Queue
const queueRedisConfig = {
    host: process.env.REDIS_QUEUE_HOST || 'localhost',
    //port: process.env.REDIS_QUEUE_PORT || 6333,  // Port mới cho Queue
    port: 6333,  // Port mới cho Queue

    password: process.env.REDIS_QUEUE_PASSWORD || process.env.REDIS_PASSWORD
};

// Queue cho việc tạo short URL
const shortenQueue = new Queue('url-shortening', {
    redis: queueRedisConfig,  // Sử dụng config mới
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 250
        },
        removeOnComplete: true,
        removeOnFail: 3000
    },
    limiter: {
        max: 8000,
        duration: 3500
    }
});

// Queue cho redirect
const redirectQueue = new Queue('url-redirect', {
    redis: queueRedisConfig,  // Sử dụng config mới
    defaultJobOptions: {
        attempts: 2,
        backoff: {
            type: 'exponential',
            delay: 250
        },
        removeOnComplete: true,
        removeOnFail: 3000
    },
    limiter: {
        max: 8000,
        duration: 5000
    }
});

// Monitor events cho shortening
shortenQueue.on('completed', job => {
    console.log(`Shorten job ${job.id} completed for URL: ${job.data.url}`);
});

shortenQueue.on('failed', (job, err) => {
    console.error(`Shorten job ${job.id} failed for URL: ${job.data.url}:`, err);
});

// Monitor events cho redirect
redirectQueue.on('completed', job => {
    console.log(`Redirect job ${job.id} completed for shortUrl: ${job.data.shortUrl}`);
});

redirectQueue.on('failed', (job, err) => {
    console.error(`Redirect job ${job.id} failed for shortUrl: ${job.data.shortUrl}:`, err);
});

module.exports = {
    shortenQueue,
    redirectQueue
};