// controllers/urlController.js
const urlService = require('../services/urlService');
const { shortenQueue, redirectQueue } = require('../config/queueConfig');

class UrlController {
    // async shortenUrl(req, res) {
    //     try {
    //         const { url } = req.body;
    //         console.log('Received URL to shorten:', url);

    //         if (!url) {
    //             return res.status(400).json({ error: 'URL is required' });
    //         }

    //         const job = await shortenQueue.add({
    //             url,
    //             timestamp: Date.now()
    //         });

    //         const result = await job.finished();

    //         if (result && result.shortUrl) {
    //             res.json({ shortUrl: result.shortUrl });
    //         } else {
    //             throw new Error('URL shortening failed');
    //         }
    //     } catch (error) {
    //         console.error('Controller error in shortenUrl:', error);
    //         res.status(400).json({ error: error.message });
    //     }
    // }
    async shortenUrl(req, res) {
        try {
            const { url } = req.body;
            console.log('Received URL to shorten:', url);

            if (!url) {
                return res.status(400).json({ error: 'URL is required' });
            }

            // Cache được check sau khi qua rate limit
            const job = await shortenQueue.add({
                url,
                timestamp: Date.now()
            });

            const result = await job.finished();

            if (result && result.shortUrl) {
                res.json({ shortUrl: result.shortUrl });
            } else {
                throw new Error('URL shortening failed');
            }
        } catch (error) {
            console.error('Controller error in shortenUrl:', error);
            res.status(400).json({ error: error.message });
        }
    }

    async getJobStatus(req, res) {
        try {
            const { jobId } = req.params;
            const shortenJob = await shortenQueue.getJob(jobId);
            const redirectJob = await redirectQueue.getJob(jobId);

            const job = shortenJob || redirectJob;
            if (!job) {
                return res.status(404).json({ error: 'Job not found' });
            }

            const state = await job.getState();
            const progress = job.progress();
            let result = null;

            if (state === 'completed') {
                result = job.returnvalue;
            }

            res.json({
                jobId,
                state,
                progress,
                result
            });
        } catch (error) {
            console.error('Error getting job status:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async redirectToOriginalUrl(req, res) {
        try {
            const { shortUrl } = req.params;
            console.log('Received redirect request for:', shortUrl);

            if (shortUrl.includes('.')) {
                return res.status(404).json({ error: 'Invalid short URL' });
            }

            const job = await redirectQueue.add({
                shortUrl,
                timestamp: Date.now()
            });

            const result = await job.finished();

            if (result && result.originalUrl) {
                const url = result.originalUrl;
                if (!url.startsWith('http://') && !url.startsWith('https://')) {
                    return res.redirect(`http://${url}`);
                }
                res.redirect(url);
            } else {
                throw new Error('Redirect failed');
            }
        } catch (error) {
            console.error('Controller error in redirect:', error);
            res.status(404).json({ error: 'Short URL not found' });
        }
    }
}

module.exports = new UrlController();