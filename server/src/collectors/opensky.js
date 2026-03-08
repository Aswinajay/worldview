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

const fetchFlightsArea = async (lat, lon, dist = 250) => {
    const url = `https://api.adsb.lol/v2/lat/${lat}/lon/${lon}/dist/${dist}`;
    const options = {
        headers: { 'User-Agent': 'WorldView/1.0' },
        timeout: 20000 // 20s per attempt
    };

    let res;
    let attempts = 4; // Increased to 4 attempts

    for (let i = 0; i < attempts; i++) {
        try {
            const start = Date.now();
            res = await fetch(url, options);
            const duration = Date.now() - start;

            if (res.ok) {
                if (i > 0) console.log(`[Collector/ADSB] Recovered area ${lat},${lon} on attempt ${i + 1} (${duration}ms)`);
                break;
            }

            console.warn(`[Collector/ADSB] Attempt ${i + 1} failed for ${lat},${lon}: HTTP ${res.status} (${duration}ms)`);
        } catch (err) {
            console.warn(`[Collector/ADSB] Attempt ${i + 1} errored for ${lat},${lon}: ${err.message}`);

            if (i === attempts - 1) {
                console.error(`[Collector/ADSB] Critical failure for area ${lat},${lon} after ${attempts} attempts. Last error: ${err.message}`);
                return [];
            }
        }

        // Exponential backoff: 3s, 6s, 12s
        if (i < attempts - 1) {
            const wait = Math.pow(2, i) * 3000;
            await new Promise(r => setTimeout(r, wait));
        }
    }

    if (!res || !res.ok) return [];

    try {
        const data = await res.json();
        if (data.ac && data.ac.length > 0) {
            const insertStmt = db.prepare(`
                INSERT OR REPLACE INTO flights (icao24, callsign, origin_country, longitude, latitude, altitude, velocity, heading)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);

            const insertMany = db.transaction((records) => {
                for (const flight of records) {
                    if (flight.lon !== undefined && flight.lat !== undefined) {
                        try {
                            insertStmt.run(
                                flight.hex,
                                flight.flight ? flight.flight.trim() : '',
                                'Unknown',
                                flight.lon,
                                flight.lat,
                                flight.alt_baro || flight.alt_geom || 0,
                                flight.gs || 0,
                                flight.track || 0
                            );
                        } catch (e) { /* ignore single record errors */ }
                    }
                }
            });
            insertMany(data.ac);
            return data.ac;
        }
        return [];
    } catch (err) {
        console.error(`[Collector] JSON Parse error for area ${lat},${lon}:`, err);
        return [];
    }
};

const fetchFlights = async () => {
    console.log(`[${new Date().toISOString()}] Fetching real-time ADS-B flight data...`);
    let totalFlights = 0;
    for (const hub of HUBS) {
        const ac = await fetchFlightsArea(hub.lat, hub.lon, hub.dist);
        totalFlights += ac.length;
    }
    console.log(`Saved ${totalFlights} real-time flight records from hubs.`);
};

module.exports = { fetchFlights, fetchFlightsArea };
