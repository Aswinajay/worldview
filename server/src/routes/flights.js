const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET /api/flights?time=ISO_TIMESTAMP - Returns positions at a specific time, or latest if no time given
router.get('/', (req, res) => {
    try {
        const { time } = req.query;
        let flights;

        if (time) {
            // Historical query: get flights closest to the given timestamp
            const targetTime = new Date(time).toISOString();
            flights = db.prepare(`
                SELECT * FROM flights
                WHERE timestamp BETWEEN datetime(?, '-15 seconds') AND datetime(?, '+15 seconds')
                GROUP BY icao24
                HAVING MIN(ABS(strftime('%s', timestamp) - strftime('%s', ?)))
            `).all(targetTime, targetTime, targetTime);
        } else {
            // Live query: most recent data
            flights = db.prepare(`
                SELECT * FROM flights
                WHERE timestamp > datetime('now', '-2 minutes')
                GROUP BY icao24
                HAVING MAX(timestamp)
            `).all();
        }

        res.json(flights);
    } catch (err) {
        console.error('Error fetching flights:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

module.exports = router;
