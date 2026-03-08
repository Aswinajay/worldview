const db = require('../db/database');
const fetch = require('node-fetch');
const httpsAgent = new require('https').Agent({ family: 4, keepAlive: true });
const httpAgent = new require('http').Agent({ family: 4, keepAlive: true });

// Real-time complete public AIS feed from Finland's Digitraffic (covers Baltic Sea heavily, extremely high quality)
const AIS_URL = 'https://meri.digitraffic.fi/api/ais/v1/locations';

const fetchMaritime = async () => {
    console.log(`[${new Date().toISOString()}] Fetching real-time maritime AIS data from Digitraffic...`);

    try {
        const attempts = 3;
        let res;
        for (let i = 0; i < attempts; i++) {
            try {
                res = await fetch(AIS_URL, {
                    agent: (parsed) => parsed.protocol === 'http:' ? httpAgent : httpsAgent,
                    headers: {
                        'Accept-Encoding': 'gzip',
                        'User-Agent': 'WorldView/1.0'
                    },
                    timeout: 20000 // 20s
                });
                if (res.ok) break;
                console.warn(`[Maritime] Retry ${i + 1}/${attempts} - HTTP ${res.status}`);
            } catch (e) {
                console.warn(`[Maritime] Retry ${i + 1}/${attempts} - ${e.message}`);
            }
            if (i < attempts - 1) {
                const wait = Math.pow(2, i) * 1000;
                await new Promise(r => setTimeout(r, wait));
            }
        }

        if (!res || !res.ok) {
            console.error('Failed to fetch maritime data after retries');
            return;
        }

        const parsedData = await res.json();

        if (!parsedData.features) {
            console.warn('Digitraffic response missing features');
            return;
        }

        const ships = parsedData.features;
        console.log(`Received ${ships.length} real ship signals from Digitraffic. Saving to database...`);

        const insertStmt = db.prepare(`
            INSERT INTO maritime (mmsi, ship_name, ship_type, longitude, latitude, heading, speed)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        let savedCount = 0;
        const insertMany = db.transaction((records) => {
            for (const ship of records) {
                if (ship.geometry && ship.geometry.coordinates) {
                    insertStmt.run(
                        ship.mmsi,
                        ship.properties.name || `Vessel ${ship.mmsi}`,
                        ship.properties.type || 'Cargo',
                        ship.geometry.coordinates[0],
                        ship.geometry.coordinates[1],
                        ship.properties.cog || 0,
                        ship.properties.sog || 0
                    );
                    savedCount++;
                }
            }
        });

        insertMany(ships);
        console.log(`Successfully indexed ${savedCount} global maritime vessels.`);
    } catch (err) {
        console.error('Error fetching maritime AIS:', err.message);
    }
};

module.exports = { fetchMaritime };
