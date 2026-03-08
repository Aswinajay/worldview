const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET /api/search?q=<query> — Search flights and maritime entities
router.get('/', (req, res) => {
    const query = (req.query.q || '').trim();
    if (!query || query.length < 2) return res.json([]);

    const results = [];
    const like = `%${query}%`;

    try {
        // Search flights by callsign or icao24
        const flights = db.prepare(`
            SELECT DISTINCT icao24, callsign, longitude, latitude, origin_country
            FROM flights
            WHERE callsign LIKE ? OR icao24 LIKE ?
            ORDER BY timestamp DESC
            LIMIT 10
        `).all(like, like);

        flights.forEach(f => {
            results.push({
                type: 'flight',
                name: f.callsign || f.icao24,
                callsign: f.callsign,
                icao24: f.icao24,
                longitude: f.longitude,
                latitude: f.latitude,
                origin_country: f.origin_country
            });
        });

        // Search maritime by ship name or MMSI
        const ships = db.prepare(`
            SELECT DISTINCT mmsi, ship_name, ship_type, longitude, latitude
            FROM maritime
            WHERE ship_name LIKE ? OR CAST(mmsi AS TEXT) LIKE ?
            ORDER BY timestamp DESC
            LIMIT 10
        `).all(like, like);

        ships.forEach(s => {
            results.push({
                type: 'ship',
                name: s.ship_name,
                ship_name: s.ship_name,
                mmsi: s.mmsi,
                longitude: s.longitude,
                latitude: s.latitude,
                ship_type: s.ship_type
            });
        });

        // Search events by title
        const events = db.prepare(`
            SELECT id, title, type, longitude, latitude
            FROM events
            WHERE title LIKE ?
            LIMIT 5
        `).all(like);

        events.forEach(e => {
            results.push({
                type: 'event',
                name: e.title,
                longitude: e.longitude,
                latitude: e.latitude
            });
        });

    } catch (err) {
        console.error('Search error:', err.message);
    }

    res.json(results);
});

module.exports = router;
