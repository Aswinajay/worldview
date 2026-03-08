const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const EARTHQUAKES_CACHE = path.resolve(__dirname, '../../data/earthquakes_cache.json');

// GET /api/earthquakes
router.get('/', (req, res) => {
    try {
        if (fs.existsSync(EARTHQUAKES_CACHE)) {
            const data = JSON.parse(fs.readFileSync(EARTHQUAKES_CACHE, 'utf8'));
            res.json(data);
        } else {
            res.json([]);
        }
    } catch (err) {
        console.error('Error fetching earthquake data:', err);
        res.status(500).json({ error: 'Earthquake data unavailable' });
    }
});

module.exports = router;
