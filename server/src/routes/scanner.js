const express = require('express');
const router = express.Router();
const { fetchFlightsArea } = require('../collectors/opensky');
const { fetchMaritime } = require('../collectors/maritime');
const { fetchEarthquakes } = require('../collectors/earthquakes');
const { fetchEonet } = require('../collectors/eonet');

const lastScan = new Map();
let lastGlobalScan = 0;

const SCAN_COOLDOWN = 60000; // 1 minute cooldown per ADSB area
const GLOBAL_COOLDOWN = 60000; // 1 minute cooldown for global updates

// POST /api/scanner/trigger - Trigger a high-fidelity scan for a specific location
router.post('/trigger', async (req, res) => {
    try {
        const { lat, lon } = req.body;
        if (!lat || !lon) return res.status(400).json({ error: 'Missing coordinates' });

        const now = Date.now();
        let globalTriggered = false;

        // Trigger global endpoints if cooldown has elapsed
        if (now - lastGlobalScan > GLOBAL_COOLDOWN) {
            lastGlobalScan = now;
            globalTriggered = true;
            console.log(`[Scanner] Evaluating global maritime & environmental scans...`);
            fetchMaritime().catch(console.error);
            fetchEarthquakes().catch(console.error);
            fetchEonet().catch(console.error);
        }

        // Decrease granularity (2-degree grid) to prevent spamming small movements for local ADSB scans
        const areaKey = `${Math.floor(lat / 2) * 2},${Math.floor(lon / 2) * 2}`;

        if (lastScan.has(areaKey) && (now - lastScan.get(areaKey) < SCAN_COOLDOWN)) {
            return res.json({
                status: 'cooldown',
                message: globalTriggered ? 'Global scan initiated, local cooled down' : 'Area recently scanned'
            });
        }

        lastScan.set(areaKey, now);
        console.log(`[Scanner] Triggered on-demand ADSB scan for ${lat}, ${lon}`);

        // Trigger the ADSB sector scan
        fetchFlightsArea(lat, lon, 300).catch(console.error);

        res.json({ status: 'triggered', message: 'Area logic initiated' });
    } catch (err) {
        console.error('Scanner error:', err);
        res.status(500).json({ error: 'Internal scanner error' });
    }
});

module.exports = router;
