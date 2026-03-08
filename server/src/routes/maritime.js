const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET /api/maritime - Returns ship positions
router.get('/', (req, res) => {
    try {
        const { time, west, south, east, north } = req.query;
        let ships;

        const useBbox = west && south && east && north;
        const bboxFilter = useBbox
            ? `AND longitude BETWEEN ? AND ? AND latitude BETWEEN ? AND ?`
            : '';
        const params = useBbox
            ? [parseFloat(west), parseFloat(east), parseFloat(south), parseFloat(north)]
            : [];

        if (time) {
            const targetTime = new Date(time).toISOString();
            const query = `
                SELECT * FROM maritime
                WHERE timestamp BETWEEN datetime(?, '-30 seconds') AND datetime(?, '+30 seconds')
                ${bboxFilter}
                GROUP BY mmsi
                HAVING MIN(ABS(strftime('%s', timestamp) - strftime('%s', ?)))
            `;
            ships = db.prepare(query).all(targetTime, targetTime, ...params, targetTime);
        } else {
            const query = `
                SELECT * FROM maritime
                WHERE timestamp > datetime('now', '-5 minutes')
                ${bboxFilter}
                GROUP BY mmsi
                HAVING MAX(timestamp)
            `;
            ships = db.prepare(query).all(...params);
        }

        res.json(ships);
    } catch (err) {
        console.error('Error fetching maritime:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

module.exports = router;
