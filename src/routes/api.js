const express = require('express');
const router = express.Router();
const newsService = require('../services/newsService');
const currencyService = require('../services/currencyService');
const logger = require('../utils/logger');

// News endpoint
router.get('/news/:section', async (req, res) => {
    try {
        const section = req.params.section;
        const data = await newsService.getNews(section);
        res.json({ success: true, data });
    } catch (error) {
        logger.error('News API error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Currency endpoint
router.get('/currency', async (req, res) => {
    try {
        const data = await currencyService.getRates();
        res.json({ success: true, data });
    } catch (error) {
        logger.error('Currency API error:', error);
        res.json({ 
            success: false, 
            data: currencyService.getDefaultRates() 
        });
    }
});

// YouTube endpoint
router.get('/youtube/:section?', async (req, res) => {
    res.json({
        success: true,
        data: {
            videos: [],
            message: 'YouTube service initializing...'
        }
    });
});

module.exports = router;
