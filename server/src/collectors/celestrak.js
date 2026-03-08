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
    const url = `https://celestrak.org/NORAD/elements/gp.php?GROUP=${group.id}&FORMAT=json`;
    try {
        const res = await fetch(url.replace('.org', '.com'), {
            headers: {
                'User-Agent': 'WorldView/1.0',
                'Accept': 'application/json'
            },
            timeout: 15000
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        if (!Array.isArray(data)) return [];

        const processed = data.slice(0, group.limit || 50).map(s => ({
            ...s,
            group: group.name,
            color: group.color
        }));

        console.log(`  [Satellite] Fetched ${processed.length} assets for ${group.name}`);
        return processed;
    } catch (err) {
        console.error(`  [Satellite] Failed to fetch ${group.name}: ${err.message}`);
        return [];
    }
};

const fetchTLEs = async () => {
    console.log(`[${new Date().toISOString()}] Initiating global satellite TLE sync...`);
    try {
        const results = await Promise.all(GROUPS.map(g => fetchGroup(g)));
        const allSatellites = results.flat();

        if (allSatellites.length > 0) {
            fs.writeFileSync(TLE_CACHE_PATH, JSON.stringify(allSatellites, null, 2));
            console.log(`Orbital database synchronized: ${allSatellites.length} active assets cached.`);
        }
    } catch (err) {
        console.error('Critical error in satellite sync:', err.message);
    }
};

module.exports = { fetchTLEs };
