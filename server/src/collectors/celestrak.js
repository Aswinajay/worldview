const https = require('https');
const fs = require('fs');
const path = require('path');

const TLE_CACHE_PATH = path.resolve(__dirname, '../../data/tle_cache.json');

// Satellite groups to fetch from CelesTrak
const GROUPS = [
    { name: 'Starlink', url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=json', color: '#00e676' },
    { name: 'GPS', url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=gps-ops&FORMAT=json', color: '#ffffff' },
    { name: 'Active Satellites', url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=json', color: '#00d2ff' },
];

const fetchJSON = (url) => {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'User-Agent': 'WorldView/1.0' } }, (res) => {
            if (res.statusCode !== 200) {
                res.resume();
                return reject(new Error(`HTTP ${res.statusCode}`));
            }
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch (e) { reject(e); }
            });
        }).on('error', reject);
    });
};

const fetchTLEs = async () => {
    console.log(`[${new Date().toISOString()}] Fetching TLE data from CelesTrak...`);
    try {
        // Just fetch GPS and a small subset of active sats (full Starlink is ~6000 entries)
        const gpsData = await fetchJSON(GROUPS[1].url);

        // Build a manageable list: GPS + first 200 active sats
        let activeData = [];
        try {
            activeData = await fetchJSON(GROUPS[2].url);
            activeData = activeData.slice(0, 200); // Limit to 200 for performance
        } catch (e) {
            console.log('Could not fetch active satellites, using GPS only');
        }

        const satellites = [
            ...gpsData.map(s => ({ ...s, group: 'GPS', color: '#ffffff' })),
            ...activeData.map(s => ({ ...s, group: 'Active', color: '#00d2ff' })),
        ];

        fs.writeFileSync(TLE_CACHE_PATH, JSON.stringify(satellites, null, 2));
        console.log(`Cached ${satellites.length} satellite TLEs.`);
    } catch (err) {
        console.error('Error fetching TLEs:', err.message);
    }
};

module.exports = { fetchTLEs };
