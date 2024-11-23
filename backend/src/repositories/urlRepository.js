// repositories/urlRepository.js
const Url = require('../models/url');

class UrlRepository {
    async findByOriginalUrl(originalUrl) {
        try {
            console.log('Searching for URL:', originalUrl);
            const result = await Url.findOne({
                where: { originalUrl }
            });
            //console.log('Search result:', result);
            return result;
        } catch (error) {
            console.error('Error finding by original URL:', error);
            throw error;
        }
    }

    async findByShortUrl(shortUrl) {
        try {
            console.log('Searching for short URL:', shortUrl);
            const result = await Url.findOne({
                where: { shortUrl }
            });
            //console.log('Search result:', result);
            return result;
        } catch (error) {
            console.error('Error finding by short URL:', error);
            throw error;
        }
    }

    async create(originalUrl, shortUrl) {
        try {
            console.log('Creating new URL pair:', { originalUrl, shortUrl });
            const result = await Url.create({
                originalUrl,
                shortUrl
            });
            console.log('Created:', result.toJSON());
            return result;
        } catch (error) {
            console.error('Error creating URL:', error);
            throw error;
        }
    }
}

module.exports = new UrlRepository();