const https = require('https');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const TLE_CACHE_PATH = path.resolve(__dirname, '../../data/tle_cache.json');

// Satellite groups to fetch from CelesTrak
const GROUPS = [
    { id: 'stations', name: 'ISS/Stations', color: '#ff4081' },
    { id: 'starlink', name: 'Starlink', color: '#00e676', limit: 100 },
    { id: 'gps-ops', name: 'GPS', color: '#00d2ff' },
    { id: 'weather', name: 'Weather', color: '#ffd740' },
    { id: 'noaa', name: 'NOAA', color: '#ff9100' },
    { id: 'goes', name: 'GOES', color: '#ffea00' },
    { id: 'resource', name: 'Earth Resources', color: '#76ff03' },
    { id: 'science', name: 'Science', color: '#e040fb' },
    { id: 'visual', name: 'Brightest', color: '#ffffff' }
];

const fetchGroup = async (group) => {
    // We try .org first, then fall back to .com
    const baseUrls = [
        `https://celestrak.org/NORAD/elements/gp.php?GROUP=${group.id}&FORMAT=json`,
        `https://celestrak.com/NORAD/elements/gp.php?GROUP=${group.id}&FORMAT=json`
    ];

    const attempts = 3;
    let lastError;

    for (let i = 0; i < attempts; i++) {
        const url = baseUrls[i % baseUrls.length];
        try {
            const res = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'application/json'
                },
                timeout: 30000 // 30s
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            if (!Array.isArray(data)) return [];

            const processed = data.slice(0, group.limit || 50).map(s => ({
                ...s,
                group: group.name,
                color: group.color
            }));

            console.log(`  [Satellite] Successful sync: ${processed.length} assets for ${group.name}`);
            return processed;
        } catch (err) {
            lastError = err;
            if (i < attempts - 1) {
                const wait = Math.pow(2, i) * 3000;
                await new Promise(r => setTimeout(r, wait));
            }
        }
    }

    console.error(`  [Satellite] Final failure for ${group.name} after ${attempts} attempts: ${lastError.message}`);
    return [];
};

const fetchTLEs = async () => {
    console.log(`[${new Date().toISOString()}] Initiating global satellite TLE sync (Sequential Mode)...`);
    try {
        const allSatellites = [];
        // Sequential to avoid slamming the API and getting throttled
        for (const group of GROUPS) {
            const assets = await fetchGroup(group);
            allSatellites.push(...assets);
            // Small gap between groups
            await new Promise(r => setTimeout(r, 1000));
        }

        if (allSatellites.length > 0) {
            fs.writeFileSync(TLE_CACHE_PATH, JSON.stringify(allSatellites, null, 2));
            console.log(`Orbital database synchronized: ${allSatellites.length} active assets cached.`);
        }
    } catch (err) {
        console.error('Critical error in satellite sync:', err.message);
    }
};

module.exports = { fetchTLEs };
