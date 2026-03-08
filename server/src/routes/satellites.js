const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const TLE_CACHE_PATH = path.resolve(__dirname, '../../data/tle_cache.json');

// GET /api/satellites - Returns cached TLE data
router.get('/', (req, res) => {
    try {
        if (fs.existsSync(TLE_CACHE_PATH)) {
            const data = JSON.parse(fs.readFileSync(TLE_CACHE_PATH, 'utf8'));
            res.json(data);
        } else {
            res.json([]);
        }
    } catch (err) {
        console.error('Error fetching satellites:', err);
        res.status(500).json({ error: 'TLE data unavailable' });
    }
});

module.exports = router;
