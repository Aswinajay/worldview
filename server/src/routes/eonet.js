const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const EONET_CACHE = path.resolve(__dirname, '../../data/eonet_cache.json');

// GET /api/eonet
router.get('/', (req, res) => {
    try {
        if (fs.existsSync(EONET_CACHE)) {
            const data = JSON.parse(fs.readFileSync(EONET_CACHE, 'utf8'));
            res.json(data);
        } else {
            res.json([]);
        }
    } catch (err) {
        console.error('Error fetching EONET data:', err);
        res.status(500).json({ error: 'EONET data unavailable' });
    }
});

module.exports = router;
