const express = require('express');
const router = express.Router();
const { fetchFlightsArea } = require('../collectors/opensky');

const lastScan = new Map();
const SCAN_COOLDOWN = 60000; // 1 minute cooldown per area

// POST /api/scanner/trigger - Trigger a high-fidelity scan for a specific location
router.post('/trigger', async (req, res) => {
    try {
        const { lat, lon } = req.body;
        if (!lat || !lon) return res.status(400).json({ error: 'Missing coordinates' });

        // Simple area key (1x1 degree precision to prevent spamming small movements)
        const areaKey = `${Math.floor(lat)},${Math.floor(lon)}`;
        const now = Date.now();

        if (lastScan.has(areaKey) && (now - lastScan.get(areaKey) < SCAN_COOLDOWN)) {
            return res.json({ status: 'cooldown', message: 'Area recently scanned' });
        }

        lastScan.set(areaKey, now);
        console.log(`[Scanner] Triggered on-demand scan for ${lat}, ${lon}`);

        // Trigger the scan (don't await for response to keep UI snappy)
        fetchFlightsArea(lat, lon, 300).catch(console.error);

        res.json({ status: 'triggered', message: 'Area scan initiated' });
    } catch (err) {
        console.error('Scanner error:', err);
        res.status(500).json({ error: 'Internal scanner error' });
    }
});

module.exports = router;
