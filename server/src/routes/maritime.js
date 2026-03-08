const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET /api/maritime - Returns ship positions
router.get('/', (req, res) => {
    try {
        const { time } = req.query;
        let ships;

        if (time) {
            const targetTime = new Date(time).toISOString();
            ships = db.prepare(`
                SELECT * FROM maritime
                WHERE timestamp BETWEEN datetime(?, '-30 seconds') AND datetime(?, '+30 seconds')
                GROUP BY mmsi
                HAVING MIN(ABS(strftime('%s', timestamp) - strftime('%s', ?)))
            `).all(targetTime, targetTime, targetTime);
        } else {
            ships = db.prepare(`
                SELECT * FROM maritime
                WHERE timestamp > datetime('now', '-5 minutes')
                GROUP BY mmsi
                HAVING MAX(timestamp)
            `).all();
        }

        res.json(ships);
    } catch (err) {
        console.error('Error fetching maritime:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

module.exports = router;
