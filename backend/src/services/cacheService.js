// services/cacheService.js
const Redis = require('ioredis');

const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
    }
});

redis.on('error', (err) => console.error('Redis Client Error:', err));
redis.on('connect', () => console.log('Redis Client Connected'));

class CacheService {
    constructor() {
        this.redis = require('../config/redis');
        this.CACHE_TTL = 3600; // 1 hour in seconds
    }

    // Thêm method mới để handle update shortUrl
    async updateShortUrl(originalUrl, oldShortUrl, newShortUrl) {
        try {
            // Xóa các key cũ
            const oldShortKey = `short:${oldShortUrl}`;
            await this.redis.del(oldShortKey);

            // Set các key mới
            const originalKey = `original:${originalUrl}`;
            const newShortKey = `short:${newShortUrl}`;

            const pipeline = this.redis.pipeline();
            pipeline.setex(originalKey, this.CACHE_TTL, newShortUrl);
            pipeline.setex(newShortKey, this.CACHE_TTL, originalUrl);
            await pipeline.exec();

            // Publish update event
            await this.redis.publishCacheUpdate({
                type: 'url_updated',
                originalUrl,
                oldShortUrl,
                newShortUrl
            });

            console.log('Cache updated for URLs:', {
                originalUrl,
                oldShortUrl,
                newShortUrl
            });
        } catch (error) {
            console.error('Cache update error:', error);
            throw error;
        }
    }

    async getOriginalUrl(shortUrl) {
        try {
            const key = `short:${shortUrl}`;
            const cachedUrl = await this.redis.get(key);
            if (cachedUrl) {
                console.log('Cache hit for short URL:', shortUrl);
            }
            return cachedUrl;
        } catch (error) {
            console.error('Cache get error:', error);
            return null;
        }
    }

    async getShortUrl(originalUrl) {
        try {
            const key = `original:${originalUrl}`;
            const cachedShortUrl = await this.redis.get(key);
            if (cachedShortUrl) {
                console.log('Cache hit for original URL:', originalUrl);
            }
            return cachedShortUrl;
        } catch (error) {
            console.error('Cache get error:', error);
            return null;
        }
    }

    async setUrlPair(originalUrl, shortUrl) {
        try {
            const originalKey = `original:${originalUrl}`;
            const shortKey = `short:${shortUrl}`;

            const pipeline = this.redis.pipeline();
            pipeline.setex(originalKey, this.CACHE_TTL, shortUrl);
            pipeline.setex(shortKey, this.CACHE_TTL, originalUrl);

            await pipeline.exec();

            // Publish update event
            await this.redis.publishCacheUpdate({
                type: 'url_updated',
                originalUrl,
                shortUrl
            });

        } catch (error) {
            console.error('Cache set error:', error);
        }
    }

    async invalidateUrlPair(originalUrl, shortUrl) {
        try {
            const originalKey = `original:${originalUrl}`;
            const shortKey = `short:${shortUrl}`;

            const pipeline = this.redis.pipeline();
            pipeline.del(originalKey);
            pipeline.del(shortKey);

            await pipeline.exec();

            // Publish delete event
            await this.redis.publishCacheUpdate({
                type: 'url_deleted',
                originalUrl,
                shortUrl
            });

        } catch (error) {
            console.error('Cache invalidation error:', error);
        }
    }

    async updateUrlPair(oldOriginalUrl, oldShortUrl, newOriginalUrl, newShortUrl) {
        try {
            // Xóa cặp cũ
            await this.invalidateUrlPair(oldOriginalUrl, oldShortUrl);

            // Set cặp mới
            await this.setUrlPair(newOriginalUrl, newShortUrl);

            console.log('Cache updated successfully:', {
                old: { originalUrl: oldOriginalUrl, shortUrl: oldShortUrl },
                new: { originalUrl: newOriginalUrl, shortUrl: newShortUrl }
            });
        } catch (error) {
            console.error('Cache update error:', error);
            throw error;
        }
    }

    async getCacheData() {
        try {
            let allKeys = [];
            let cursor = '0';

            do {
                const [nextCursor, keys] = await this.redis.scan(
                    cursor,
                    'MATCH',
                    '*:*',
                    'COUNT',
                    100
                );
                cursor = nextCursor;
                allKeys = allKeys.concat(keys);
            } while (cursor !== '0');

            const cacheData = {};

            if (allKeys.length > 0) {
                const pipeline = this.redis.pipeline();

                allKeys.forEach(key => {
                    pipeline.get(key);
                    pipeline.ttl(key);
                });

                const results = await pipeline.exec();

                allKeys.forEach((key, index) => {
                    const valueIndex = index * 2;
                    const ttlIndex = valueIndex + 1;

                    if (results[valueIndex] && results[ttlIndex]) {
                        cacheData[key] = {
                            value: results[valueIndex][1],
                            ttl: results[ttlIndex][1]
                        };
                    }
                });
            }

            return cacheData;
        } catch (error) {
            console.error('Get cache data error:', error);
            throw error;
        }
    }

    async deleteKey(key) {
        try {
            if (key.startsWith('original:') || key.startsWith('short:')) {
                await this.redis.del(key);
                console.log('Deleted key:', key);
            }
        } catch (error) {
            console.error('Delete key error:', error);
            throw error;
        }
    }

    async clearCache() {
        try {
            let cursor = '0';
            do {
                const [nextCursor, keys] = await this.redis.scan(
                    cursor,
                    'MATCH',
                    '*:*',
                    'COUNT',
                    100
                );
                cursor = nextCursor;

                if (keys.length > 0) {
                    await this.redis.del(...keys);
                    console.log('Deleted keys:', keys);
                }
            } while (cursor !== '0');

            console.log('Cache cleared');
        } catch (error) {
            console.error('Clear cache error:', error);
            throw error;
        }
    }
}

module.exports = new CacheService();