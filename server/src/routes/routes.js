const express = require('express');
const router = express.Router();
const db = require('../db/database');

// Get global air routes with airport coordinates
router.get('/', (req, res) => {
    try {
        const query = `
            SELECT 
                r.id,
                a1.icao as origin_icao, a1.latitude as origin_lat, a1.longitude as origin_lon, a1.name as origin_name, a1.city as origin_city,
                a2.icao as dest_icao, a2.latitude as dest_lat, a2.longitude as dest_lon, a2.name as dest_name, a2.city as dest_city,
                r.usage_score
            FROM global_routes r
            JOIN airports a1 ON r.origin_icao = a1.icao
            JOIN airports a2 ON r.dest_icao = a2.icao
        `;
        const routes = db.prepare(query).all();
        res.json(routes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Search and classify airports
router.get('/airports', (req, res) => {
    const q = req.query.q || '';
    try {
        let airports;

        // If query is empty, prioritize rendering military bases for tactical context
        if (q === '') {
            airports = db.prepare(`
                SELECT * FROM airports 
                WHERE name LIKE '% AFB' 
                   OR name LIKE '% Air Base' 
                   OR name LIKE '% NAS' 
                   OR name LIKE '% Naval Air Station' 
                   OR name LIKE '% AAF' 
                   OR name LIKE '% Army Airfield'
                LIMIT 50
            `).all();
        } else {
            airports = db.prepare(`
                SELECT * FROM airports 
                WHERE icao LIKE ? OR iata LIKE ? OR name LIKE ? OR city LIKE ?
                LIMIT 50
            `).all(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
        }

        // Add tactical classification layer directly into the response payload
        const classifiedAirports = airports.map(apt => {
            const name = apt.name.toUpperCase();
            let classification = 'CIVILIAN HUB';
            if (name.includes('AFB') || name.includes('AIR FORCE') || name.includes('AIR BASE')) {
                classification = 'STRATEGIC AIRBASE';
            } else if (name.includes('NAS') || name.includes('NAVAL')) {
                classification = 'NAVAL AIR STATION';
            } else if (name.includes('AAF') || name.includes('ARMY')) {
                classification = 'ARMY AIRFIELD';
            } else if (name.includes('JOINT RESERVE')) {
                classification = 'JOINT TACTICAL HUB';
            }

            return {
                ...apt,
                tactical_class: classification
            };
        });

        res.json(classifiedAirports);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
