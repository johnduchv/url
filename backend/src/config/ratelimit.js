// ratelimit.js
const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis')
const Redis = require('ioredis');

const redisClient = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
});

const createRateLimiter = (options) => {
    return rateLimit({
        store: new RedisStore({
            sendCommand: (...args) => redisClient.call(...args),
            resetExpiryOnChange: true,
        }),
        windowMs: options.windowMs || 15 * 60 * 1000,
        max: options.max || 100,
        keyGenerator: options.keyGenerator,
        handler: (req, res) => {
            // Thêm Retry-After header và thông tin chi tiết hơn
            res.setHeader('Retry-After', Math.ceil(options.windowMs / 1000));
            res.status(429).json({
                error: 'Rate limit exceeded',
                message: options.message,
                retryAfter: Math.ceil(options.windowMs / 1000)
            });
        },
        skip: options.skip || (() => false),
    });
};

module.exports = {
    // Rate limit cho redirect
    redirectLimiter: createRateLimiter({
        windowMs: 1 * 60 * 1000 / 2,
        max: 150000000,
        keyGenerator: (req) => {
            return `redirect-${req.ip}-${req.params.shortUrl}`;
        },
        message: 'You have exceeded the redirect limit for this URL. Please wait a minute.',
        skip: (req) => req.params.shortUrl.includes('.')
    }),

    // Rate limit cho API tạo short URL
    shortenLimiter: createRateLimiter({
        windowMs: 1 * 60 * 1000, // 1 phút
        max: 150000000, // 3 request/phút - giảm xuống để test
        keyGenerator: (req) => `shorten-${req.ip}`,
        message: 'You have exceeded the URL shortening limit. Please try again in a minute.'
    })
};
// const rateLimit = require('express-rate-limit');
// const { RedisStore } = require('rate-limit-redis')
// const Redis = require('ioredis');

// const redisClient = new Redis({
//     host: process.env.REDIS_HOST || 'localhost',
//     port: process.env.REDIS_PORT || 6379,
//     password: process.env.REDIS_PASSWORD,
// });

// const createRateLimiter = (options) => {
//     return rateLimit({
//         store: new RedisStore({
//             sendCommand: (...args) => redisClient.call(...args),
//             resetExpiryOnChange: true, // Reset expiry on changes
//         }),
//         windowMs: options.windowMs || 15 * 60 * 1000,
//         max: options.max || 100,
//         keyGenerator: options.keyGenerator,
//         handler: (req, res) => {
//             res.status(429).json({
//                 error: 'Rate limit exceeded',
//                 message: options.message
//             });
//         },
//         skip: options.skip || (() => false),
//     });
// };

// module.exports = {
//     // Rate limit cho redirect
//     redirectLimiter: createRateLimiter({
//         windowMs: 60 * 1000, // 1 phút
//         max: 150000000, // 10 lần/phút
//         keyGenerator: (req) => {
//             // Tạo key dựa trên IP và shortUrl
//             return `redirect-${req.ip}-${req.params.shortUrl}`;
//         },
//         message: 'You have exceeded the redirect limit for this URL. Please wait a minute.',
//         skip: (req) => req.params.shortUrl.includes('.') // Bỏ qua static files
//     }),

//     // Rate limit cho API tạo short URL
//     shortenLimiter: createRateLimiter({
//         windowMs: 1 * 60 * 1000, // 15 phút
//         max: 100, // 5 request/15 phút
//         keyGenerator: (req) => `shorten-${req.ip}`,
//         message: 'You have exceeded the URL shortening limit. Please try again in 15 minutes.'
//     }),

//     redirectPerUrlLimiter: createRateLimiter({
//         windowMs: 60 * 1000,  // 1 phút
//         max: 100,               // 5 requests/phút
//         keyGenerator: (req) => `${req.ip}-${req.params.shortUrl}`,
//     })
// };
// const rateLimit = require('express-rate-limit');
// const { RedisStore } = require('rate-limit-redis')
// const Redis = require('ioredis');
// const { INTEGER } = require('sequelize');
// var minute = 0;
// const redisClient = new Redis({
//     host: process.env.REDIS_HOST || 'localhost',
//     port: process.env.REDIS_PORT || 6379,
//     password: process.env.REDIS_PASSWORD,
// });

// const createRateLimiter = (options) => {
//     return rateLimit({
//         store: new RedisStore({
//             sendCommand: (...args) => redisClient.call(...args),
//         }),
//         windowMs: options.windowMs || 15 * 60 * 1000,
//         max: options.max || 100,
//         message: {
//             status: 'error',
//             message: options.message || 'Too many requests, please try again later.'
//         },
//         standardHeaders: true,
//         legacyHeaders: false,
//     });
// };



// module.exports = {
//     shortenLimiter: createRateLimiter({
//         windowMs: 15 * 60 * 1000, // 15 minutes
//         max: 5, // Limit mỗi IP 5 request trong 15 phút
//         message: 'You have exceeded the limit. Please try again in few minutes.'
//     }),

//     redirectLimiter: createRateLimiter({
//         windowMs: 60 * 1000, // 1 minute
//         max: 2,
//         message: 'Too many redirect requests. Please wait a minute.'
//     })
// };

// const rateLimit = require('express-rate-limit');
// const { RedisStore } = require('rate-limit-redis')
// const Redis = require('ioredis');

// // Tạo Redis client với cấu hình cụ thể
// const redisClient = new Redis({
//     host: process.env.REDIS_HOST || 'localhost',
//     port: process.env.REDIS_PORT || 6379,
//     password: process.env.REDIS_PASSWORD,
//     // Thêm các cấu hình khác nếu cần
// });

// const createRateLimiter = (options) => {
//     return rateLimit({
//         store: new RedisStore({
//             // Sử dụng sendCommand từ redisClient
//             sendCommand: (...args) => redisClient.call(...args),
//         }),
//         windowMs: 1 * 60 * 1000, // 15 phút
//         max: 1000, // Giới hạn mỗi IP
//         message: 'Too many1 requests from this IP, please try again later.',
//         standardHeaders: true,
//         legacyHeaders: false,
//         ...options
//     });
// };

// // Rate limiters cụ thể cho từng endpoint
// const shortenLimiter = createRateLimiter({
//     windowMs: 1 * 60 * 1000, // 15 phút
//     max: 10000, // 30 requests mỗi 15 phút
//     message: 'Too many1 URL shortening requests. Please try again later.'
// });

// const redirectLimiter = createRateLimiter({
//     windowMs: 60 * 1000, // 1 phút
//     max: 6000, // 60 requests mỗi phút
//     message: 'Too many redirect requests. Please try again later.'
// });

// module.exports = {
//     shortenLimiter,
//     redirectLimiter
// };