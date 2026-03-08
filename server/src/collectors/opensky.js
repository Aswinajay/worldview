const db = require('../db/database');
const fetch = require('node-fetch');

// We use ADSB.lol public API which provides unauthenticated real-time global flight data
// By polling major hubs, we capture thousands of real-time flights without hitting strict rate limits
const HUBS = [
    { name: 'New York', lat: 40.7128, lon: -74.0060, dist: 250 },
    { name: 'London', lat: 51.5074, lon: -0.1278, dist: 250 },
    { name: 'Dubai', lat: 25.2048, lon: 55.2708, dist: 250 },
    { name: 'Tokyo', lat: 35.6762, lon: 139.6503, dist: 250 },
    { name: 'Sydney', lat: -33.8688, lon: 151.2093, dist: 250 },
    { name: 'Frankfurt', lat: 50.1109, lon: 8.6821, dist: 250 }
];

const fetchFlights = async () => {
    console.log(`[${new Date().toISOString()}] Fetching real-time ADS-B flight data...`);

    const insertStmt = db.prepare(`
        INSERT INTO flights (icao24, callsign, origin_country, longitude, latitude, altitude, velocity, heading)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((records) => {
        for (const flight of records) {
            if (flight.lon !== undefined && flight.lat !== undefined) {
                insertStmt.run(
                    flight.hex,
                    flight.flight ? flight.flight.trim() : '',
                    'Unknown', // adsb.lol doesn't provide country lookup in the lightweight endpoint
                    flight.lon,
                    flight.lat,
                    flight.alt_baro || flight.alt_geom || 0,
                    flight.gs || 0, // ground speed in knots
                    flight.track || 0 // true track / heading
                );
            }
        }
    });

    let totalFlights = 0;

    for (const hub of HUBS) {
        try {
            const res = await fetch(`https://api.adsb.lol/v2/lat/${hub.lat}/lon/${hub.lon}/dist/${hub.dist}`, {
                headers: { 'User-Agent': 'WorldView/1.0' },
                timeout: 15000 // 15s timeout per hub
            });
            if (!res.ok) {
                console.error(`ADSB.lol API Error for ${hub.name}: Status Code ${res.status}`);
                continue;
            }

            const data = await res.json();
            if (data.ac && data.ac.length > 0) {
                insertMany(data.ac);
                totalFlights += data.ac.length;
            }
        } catch (err) {
            console.error(`Error fetching flights for ${hub.name}:`, err.message);
        }
    }

    console.log(`Saved ${totalFlights} real-time flight records from hubs.`);
};

module.exports = { fetchFlights };
