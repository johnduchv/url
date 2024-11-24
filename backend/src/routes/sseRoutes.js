// routes/sseRoutes.js
const express = require('express');
const router = express.Router();
const sseController = require('../controllers/sseController');

router.get('/cache-events', (req, res) => {
    sseController.addClient(req, res);
});

module.exports = router;