// workers/urlProcessor.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { shortenQueue, redirectQueue } = require('../config/queueConfig');
const urlService = require('../services/urlService');
const cacheService = require('../services/cacheService'); // Thêm dòng này
const numCPUs = require('os').cpus().length;
// Process shortening requests
// shortenQueue.process(async (job) => {
//     const { url } = job.data;

//     try {
//         job.progress(800);
//         //console.log(`Processing URL shortening: ${url}`);

//         const shortUrl = await urlService.shortenUrl(url);

//         job.progress(800);
//         //console.log(`URL shortening completed: ${url} -> ${shortUrl}`);

//         return { shortUrl };
//     } catch (error) {
//         console.error(`Error shortening URL ${url}:`, error);
//         throw error;
//     }
// });

// urlProcessor.js
shortenQueue.process(numCPUs, async (job) => {
    const { url } = job.data;

    try {
        job.progress(800);

        // Check cache trước khi tạo
        const cachedShortUrl = await cacheService.getShortUrl(url);
        if (cachedShortUrl) {
            return { shortUrl: cachedShortUrl };
        }

        const shortUrl = await urlService.shortenUrl(url);

        job.progress(1000);

        return { shortUrl };
    } catch (error) {
        console.error(`Error shortening URL ${url}:`, error);
        throw error;
    }
});

// Process redirect requests
redirectQueue.process(async (job) => {
    const { shortUrl } = job.data;

    try {
        job.progress(1000);
        //console.log(`Processing redirect for: ${shortUrl}`);

        const originalUrl = await urlService.getOriginalUrl(shortUrl);

        job.progress(1000);
        //console.log(`Redirect processed: ${shortUrl} -> ${originalUrl}`);

        return { originalUrl };
    } catch (error) {
        console.error(`Error processing redirect for ${shortUrl}:`, error);
        throw error;
    }
});

console.log('URL processor worker started');