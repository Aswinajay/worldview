const express = require('express');
const router = express.Router();
const db = require('../db/database');

// Get shipping lanes with port coordinates
router.get('/lanes', (req, res) => {
    try {
        const query = `
            SELECT 
                r.id,
                p1.code as origin_code, p1.latitude as origin_lat, p1.longitude as origin_lon, p1.name as origin_name, p1.city as origin_city,
                p2.code as dest_code, p2.latitude as dest_lat, p2.longitude as dest_lon, p2.name as dest_name, p2.city as dest_city,
                r.usage_score
            FROM maritime_routes r
            JOIN ports p1 ON r.origin_code = p1.code
            JOIN ports p2 ON r.dest_code = p2.code
        `;
        const lanes = db.prepare(query).all();
        res.json(lanes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all ports
router.get('/ports', (req, res) => {
    try {
        const ports = db.prepare('SELECT * FROM ports').all();
        res.json(ports);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
