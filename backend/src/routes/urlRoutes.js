// routes/urlRoutes.js
const express = require('express');
const router = express.Router();
const urlController = require('../controllers/urlController');
const { shortenLimiter } = require('../middleware/rateLimiter');
const { redirectLimiter } = require('../middleware/rateLimiter');

router.post('/shorten', shortenLimiter, urlController.shortenUrl);
router.get('/status/:jobId', urlController.getJobStatus);
router.get('/:shortUrl', redirectLimiter, urlController.redirectToOriginalUrl);
module.exports = router;