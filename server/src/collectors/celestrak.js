const https = require('https');
const fs = require('fs');
const path = require('path');

const TLE_CACHE_PATH = path.resolve(__dirname, '../../data/tle_cache.json');

// Satellite groups to fetch from CelesTrak
const GROUPS = [
    { name: 'ISS', url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=json', color: '#ff4081' },
    { name: 'Starlink', url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=json', color: '#00e676' },
    { name: 'GPS', url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=gps-ops&FORMAT=json', color: '#ffffff' },
    { name: 'Active Satellites', url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=json', color: '#00d2ff' },
];

const fetchJSON = async (url) => {
    const res = await fetch(url, { headers: { 'User-Agent': 'WorldView/1.0' } });
    if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
    }
    return await res.json();
};

const fetchTLEs = async () => {
    console.log(`[${new Date().toISOString()}] Fetching TLE data from CelesTrak...`);
    try {
        const satellites = [];

        // Fetch ISS / Space Stations (small list, always fetch)
        try {
            const issData = await fetchJSON(GROUPS[0].url);
            satellites.push(...issData.map(s => ({ ...s, group: 'ISS', color: '#ff4081' })));
            console.log(`  ISS/Stations: ${issData.length} entries`);
        } catch (e) { console.log('  Could not fetch ISS data'); }

        // Fetch GPS constellation (32 satellites)
        try {
            const gpsData = await fetchJSON(GROUPS[2].url);
            satellites.push(...gpsData.map(s => ({ ...s, group: 'GPS', color: '#ffffff' })));
            console.log(`  GPS: ${gpsData.length} entries`);
        } catch (e) { console.log('  Could not fetch GPS data'); }

        // Fetch first 50 Starlink (out of ~6000)
        try {
            const starlinkData = await fetchJSON(GROUPS[1].url);
            const limited = starlinkData.slice(0, 50);
            satellites.push(...limited.map(s => ({ ...s, group: 'Starlink', color: '#00e676' })));
            console.log(`  Starlink: ${limited.length} of ${starlinkData.length} entries`);
        } catch (e) { console.log('  Could not fetch Starlink data'); }

        // Fetch first 100 active satellites
        try {
            const activeData = await fetchJSON(GROUPS[3].url);
            const limited = activeData.slice(0, 100);
            satellites.push(...limited.map(s => ({ ...s, group: 'Active', color: '#00d2ff' })));
            console.log(`  Active: ${limited.length} of ${activeData.length} entries`);
        } catch (e) { console.log('  Could not fetch active satellites'); }

        fs.writeFileSync(TLE_CACHE_PATH, JSON.stringify(satellites, null, 2));
        console.log(`Cached ${satellites.length} satellite TLEs total.`);
    } catch (err) {
        console.error('Error fetching TLEs:', err.message);
    }
};

module.exports = { fetchTLEs };
