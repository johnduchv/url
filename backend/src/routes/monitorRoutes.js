const express = require('express');
const router = express.Router();
const cacheService = require('../services/cacheService');

// Get cache data
router.get('/cache', async (req, res) => {
    try {
        console.log('Getting cache data...');
        const cacheData = await cacheService.getCacheData();
        res.json(cacheData);
    } catch (error) {
        console.error('Monitor error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete specific key
router.delete('/cache/:key', async (req, res) => {
    try {
        const key = req.params.key;
        await cacheService.deleteKey(key);
        res.json({ message: `Deleted key: ${key}` });
    } catch (error) {
        console.error('Delete key error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Clear all cache
router.delete('/cache', async (req, res) => {
    try {
        await cacheService.clearCache();
        res.json({ message: 'Cache cleared' });
    } catch (error) {
        console.error('Clear cache error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;