const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET /api/flights?time=ISO_TIMESTAMP - Returns positions at a specific time, or latest if no time given
router.get('/', (req, res) => {
    try {
        const { time, west, south, east, north } = req.query;
        let flights;

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
                SELECT * FROM flights
                WHERE timestamp BETWEEN datetime(?, '-15 seconds') AND datetime(?, '+15 seconds')
                ${bboxFilter}
                GROUP BY icao24
                HAVING MIN(ABS(strftime('%s', timestamp) - strftime('%s', ?)))
            `;
            flights = db.prepare(query).all(targetTime, targetTime, ...params, targetTime);
        } else {
            const query = `
                SELECT * FROM flights
                WHERE timestamp > datetime('now', '-2 minutes')
                ${bboxFilter}
                GROUP BY icao24
                HAVING MAX(timestamp)
            `;
            flights = db.prepare(query).all(...params);
        }

        res.json(flights);
    } catch (err) {
        console.error('Error fetching flights:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

module.exports = router;
