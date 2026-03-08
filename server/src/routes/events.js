const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET /api/events - Returns conflict/event markers
router.get('/', (req, res) => {
    try {
        const events = db.prepare(`
            SELECT * FROM events
            ORDER BY timestamp DESC
            LIMIT 200
        `).all();
        res.json(events);
    } catch (err) {
        console.error('Error fetching events:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// POST /api/events - Create a new event marker
router.post('/', (req, res) => {
    try {
        const { type, title, description, severity, longitude, latitude, radius } = req.body;
        const stmt = db.prepare(`
            INSERT INTO events (type, title, description, severity, longitude, latitude, radius)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        const result = stmt.run(type, title, description, severity, longitude, latitude, radius);
        res.json({ id: result.lastInsertRowid });
    } catch (err) {
        console.error('Error creating event:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

module.exports = router;
