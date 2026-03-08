const https = require('https');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const TLE_CACHE_PATH = path.resolve(__dirname, '../../data/tle_cache.json');

// Satellite groups to fetch from CelesTrak
const GROUPS = [
    { name: 'ISS', url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=json', color: '#ff4081' },
    { name: 'Starlink', url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=json', color: '#00e676' },
    { name: 'GPS', url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=gps-ops&FORMAT=json', color: '#ffffff' },
    { name: 'Active Satellites', url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=json', color: '#00d2ff' },
];

const fetchJSON = async (url) => {
    // Try celestrak.com first as it has different Cloudflare rules than .org
    const res = await fetch(url.replace('.org', '.com'), {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
        },
        timeout: 20000 // 20s timeout
    });
    if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
    }
    return await res.json();
};

const fetchTLEs = async () => {
    console.log(`[${new Date().toISOString()}] Fetching TLE data from CelesTrak...`);
    try {
        const satellites = [];

        // Fetch ISS / Space Stations
        try {
            const issData = await fetchJSON(GROUPS[0].url);
            if (Array.isArray(issData)) {
                satellites.push(...issData.map(s => ({ ...s, group: 'ISS', color: '#ff4081' })));
                console.log(`  ISS/Stations: ${issData.length} entries`);
            } else {
                console.error('  ISS data is not an array:', typeof issData);
            }
        } catch (e) {
            console.error('  Could not fetch ISS data:', e.message);
        }

        // Fetch GPS constellation
        try {
            const gpsData = await fetchJSON(GROUPS[2].url);
            if (Array.isArray(gpsData)) {
                satellites.push(...gpsData.map(s => ({ ...s, group: 'GPS', color: '#ffffff' })));
                console.log(`  GPS: ${gpsData.length} entries`);
            }
        } catch (e) { console.error('  Could not fetch GPS data:', e.message); }

        // Fetch Starlink
        try {
            const starlinkData = await fetchJSON(GROUPS[1].url);
            if (Array.isArray(starlinkData)) {
                const limited = starlinkData.slice(0, 75);
                satellites.push(...limited.map(s => ({ ...s, group: 'Starlink', color: '#00e676' })));
                console.log(`  Starlink: ${limited.length} entries`);
            }
        } catch (e) { console.error('  Could not fetch Starlink data:', e.message); }

        // Fetch active satellites
        try {
            const activeData = await fetchJSON(GROUPS[3].url);
            if (Array.isArray(activeData)) {
                const limited = activeData.slice(0, 100);
                satellites.push(...limited.map(s => ({ ...s, group: 'Active', color: '#00d2ff' })));
                console.log(`  Active: ${limited.length} entries`);
            }
        } catch (e) { console.error('  Could not fetch active satellites:', e.message); }

        if (satellites.length > 0) {
            fs.writeFileSync(TLE_CACHE_PATH, JSON.stringify(satellites, null, 2));
            console.log(`Cached ${satellites.length} satellite TLEs total.`);
        }
    } catch (err) {
        console.error('Error fetching TLEs:', err.message);
    }
};

module.exports = { fetchTLEs };
