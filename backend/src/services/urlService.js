// urlService.js
const crypto = require('crypto');
const urlRepository = require('../repositories/urlRepository');
const cacheService = require('./cacheService');

class UrlService {
    async generateShortUrl(originalUrl, retryCount = 0) {
        try {
            // Salt/Key từ environment
            const secretKey = process.env.URL_SECRET_KEY || 'your-secret-key';
            const key = Buffer.from(secretKey);

            // Tạo input với originalUrl + retryCount để handle collision
            const input = `${originalUrl}${retryCount}`;

            // Generate hash với BLAKE2b
            const hash = crypto.createHash('blake2b512', {
                key: key,
                digestLength: 32
            })
                .update(input)
                .digest('hex')
                .substring(0, 7);

            try {
                // Thử tạo URL mới
                await urlRepository.create(originalUrl, hash);
                return hash;
            } catch (err) {
                // Handle collision với retry
                if (err.name === 'SequelizeUniqueConstraintError' && retryCount < 3) {
                    return this.generateShortUrl(originalUrl, retryCount + 1);
                }
                throw err;
            }
        } catch (error) {
            console.error('Error generating short URL:', error);
            throw new Error('Failed to generate short URL');
        }
    }

    // async shortenUrl(originalUrl) {
    //     try {
    //         // Check database
    //         const existingUrl = await urlRepository.findByOriginalUrl(originalUrl);
    //         if (existingUrl) {
    //             // Cache hit from database
    //             await cacheService.setUrlPair(originalUrl, existingUrl.shortUrl);
    //             return existingUrl.shortUrl;
    //         }

    //         // Create new short URL
    //         const shortUrl = await this.generateShortUrl(originalUrl);

    //         // Cache the new URL pair
    //         await cacheService.setUrlPair(originalUrl, shortUrl);
    //         return shortUrl;
    //     } catch (error) {
    //         console.error('Error in shortenUrl:', error);
    //         throw error;
    //     }
    // }
    async shortenUrl(originalUrl) {
        try {
            // Check Redis cache first
            const cachedShortUrl = await cacheService.getShortUrl(originalUrl);
            if (cachedShortUrl) {
                return cachedShortUrl;
            }

            // Check database if not in cache
            const existingUrl = await urlRepository.findByOriginalUrl(originalUrl);
            if (existingUrl) {
                // Cache hit from database
                await cacheService.setUrlPair(originalUrl, existingUrl.shortUrl);
                return existingUrl.shortUrl;
            }

            // Create new short URL
            const shortUrl = await this.generateShortUrl(originalUrl);

            // Cache the new URL pair
            await cacheService.setUrlPair(originalUrl, shortUrl);
            return shortUrl;
        } catch (error) {
            console.error('Error in shortenUrl:', error);
            throw error;
        }
    }

    async getOriginalUrl(shortUrl) {
        try {
            // Check cache
            const cachedUrl = await cacheService.getOriginalUrl(shortUrl);
            if (cachedUrl) {
                return cachedUrl;
            }

            // Query database
            const url = await urlRepository.findByShortUrl(shortUrl);
            if (!url) {
                throw new Error('Short URL not found');
            }

            // Cache the URL pair
            await cacheService.setUrlPair(url.originalUrl, shortUrl);
            return url.originalUrl;
        } catch (error) {
            console.error('Error in getOriginalUrl:', error);
            throw error;

            // const url = await urlRepository.findByShortUrl(shortUrl);
            // return url ? url.originalUrl : null;
        }
    }
}

module.exports = new UrlService();

// const crypto = require('crypto');
// const urlRepository = require('../repositories/urlRepository');
// const cacheService = require('./cacheService');

// class UrlService {
//     generateShortUrl(url) {
//         const hash = crypto.createHash('sha1').update(url).digest('hex');
//         return hash.substring(0, 7);
//     }

//     // async shortenUrl(originalUrl) {
//     //     try {
//     //         // Check cache
//     //         const cachedShortUrl = await cacheService.getShortUrl(originalUrl);
//     //         if (cachedShortUrl) {
//     //             return cachedShortUrl;
//     //         }

//     //         // Check database
//     //         const existingUrl = await urlRepository.findByOriginalUrl(originalUrl);
//     //         if (existingUrl) {
//     //             // Cache the URL pair
//     //             await cacheService.setUrlPair(originalUrl, existingUrl.shortUrl);
//     //             return existingUrl.shortUrl;
//     //         }

//     //         // Create new short URL
//     //         const shortUrl = this.generateShortUrl(originalUrl);
//     //         await urlRepository.create(originalUrl, shortUrl);

//     //         // Cache the new URL pair
//     //         await cacheService.setUrlPair(originalUrl, shortUrl);
//     //         return shortUrl;
//     //     } catch (error) {
//     //         console.error('Error in shortenUrl:', error);
//     //         throw error;
//     //     }
//     // }

//     // urlService.js
//     async shortenUrl(originalUrl) {
//         try {
//             // Bỏ phần check cache ở đây
//             // Di chuyển xuống phần xử lý job

//             // Check database
//             const existingUrl = await urlRepository.findByOriginalUrl(originalUrl);
//             if (existingUrl) {
//                 // Cache hit from database
//                 await cacheService.setUrlPair(originalUrl, existingUrl.shortUrl);
//                 return existingUrl.shortUrl;
//             }

//             // Create new short URL
//             const shortUrl = this.generateShortUrl(originalUrl);
//             await urlRepository.create(originalUrl, shortUrl);

//             // Cache the new URL pair
//             await cacheService.setUrlPair(originalUrl, shortUrl);
//             return shortUrl;
//         } catch (error) {
//             console.error('Error in shortenUrl:', error);
//             throw error;
//         }
//     }

//     async getOriginalUrl(shortUrl) {
//         try {
//             // Check cache
//             const cachedUrl = await cacheService.getOriginalUrl(shortUrl);
//             if (cachedUrl) {
//                 return cachedUrl;
//             }

//             // Query database
//             const url = await urlRepository.findByShortUrl(shortUrl);
//             if (!url) {
//                 throw new Error('Short URL not found');
//             }

//             // Cache the URL pair
//             await cacheService.setUrlPair(url.originalUrl, shortUrl);
//             return url.originalUrl;
//         } catch (error) {
//             console.error('Error in getOriginalUrl:', error);
//             throw error;
//         }
//     }
// }

// module.exports = new UrlService();