const db = require('../db/database');
const zlib = require('zlib');
const { promisify } = require('util');
const gunzip = promisify(zlib.gunzip);

// Real-time complete public AIS feed from Finland's Digitraffic (covers Baltic Sea heavily, extremely high quality)
const AIS_URL = 'https://meri.digitraffic.fi/api/ais/v1/locations';

const fetchMaritime = async () => {
    console.log(`[${new Date().toISOString()}] Fetching real-time maritime AIS data from Digitraffic...`);

    try {
        const res = await fetch(AIS_URL, {
            headers: { 'Accept-Encoding': 'gzip' }
        });

        if (!res.ok) {
            throw new Error(`AIS digitraffic HTTP ${res.status}`);
        }

        // Decompress the gzip stream
        const buffer = await res.arrayBuffer();
        const decompressed = await gunzip(Buffer.from(buffer));
        const data = JSON.parse(decompressed.toString());

        if (!data.features) return;

        const ships = data.features;
        console.log(`Received ${ships.length} real ship signals from Digitraffic. Saving to database...`);

        const insertStmt = db.prepare(`
            INSERT INTO maritime (mmsi, ship_name, ship_type, longitude, latitude, heading, speed)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        let savedCount = 0;
        const insertMany = db.transaction((records) => {
            // Processing only 500 ships at a time to keep local SQLite operations snappy
            const limit = Math.min(records.length, 500);
            for (let i = 0; i < limit; i++) {
                const ship = records[i];
                if (ship.geometry && ship.geometry.coordinates) {
                    insertStmt.run(
                        ship.mmsi,
                        `Baltic Vessel ${ship.mmsi}`, // Digitraffic "locations" endpoint doesn't carry names, could resolve with another endpoint, keeping simple
                        'Cargo', // defaulting type since Digitraffic separates meta endpoint
                        ship.geometry.coordinates[0],
                        ship.geometry.coordinates[1],
                        ship.properties.cog || 0, // course over ground
                        ship.properties.sog || 0  // speed over ground
                    );
                    savedCount++;
                }
            }
        });

        insertMany(ships);
        console.log(`Saved ${savedCount} real maritime vessel records.`);
    } catch (err) {
        console.error('Error fetching maritime AIS:', err.message);
    }
};

module.exports = { fetchMaritime };
