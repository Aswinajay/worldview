const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET /api/snapshot?time=ISO_TIMESTAMP
// Returns all layer states at a specific past moment
router.get('/', (req, res) => {
    try {
        const { time } = req.query;

        if (!time) {
            return res.status(400).json({ error: 'Missing required "time" query parameter (ISO format)' });
        }

        const targetTime = new Date(time).toISOString();

        // Get flights closest to the requested timestamp (within a 30-second window)
        const flights = db.prepare(`
      SELECT * FROM flights
      WHERE timestamp BETWEEN datetime(?, '-15 seconds') AND datetime(?, '+15 seconds')
      GROUP BY icao24
      HAVING MIN(ABS(strftime('%s', timestamp) - strftime('%s', ?)))
    `).all(targetTime, targetTime, targetTime);

        // Get maritime data closest to the requested timestamp
        const maritime = db.prepare(`
      SELECT * FROM maritime
      WHERE timestamp BETWEEN datetime(?, '-30 seconds') AND datetime(?, '+30 seconds')
      GROUP BY mmsi
      HAVING MIN(ABS(strftime('%s', timestamp) - strftime('%s', ?)))
    `).all(targetTime, targetTime, targetTime);

        // Get events active at the requested timestamp
        const events = db.prepare(`
      SELECT * FROM events
      WHERE timestamp <= ?
      ORDER BY timestamp DESC
      LIMIT 100
    `).all(targetTime);

        res.json({
            timestamp: targetTime,
            flights,
            maritime,
            events
        });

    } catch (err) {
        console.error('Error fetching snapshot:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

module.exports = router;
