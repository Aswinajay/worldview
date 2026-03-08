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
    try {
        const res = await fetch(`https://api.adsb.lol/v2/lat/${lat}/lon/${lon}/dist/${dist}`, {
            headers: { 'User-Agent': 'WorldView/1.0' },
            timeout: 10000
        });
        if (!res.ok) return [];

        const data = await res.json();
        if (data.ac && data.ac.length > 0) {
            const insertStmt = db.prepare(`
                INSERT OR REPLACE INTO flights (icao24, callsign, origin_country, longitude, latitude, altitude, velocity, heading)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);

            const insertMany = db.transaction((records) => {
                for (const flight of records) {
                    if (flight.lon !== undefined && flight.lat !== undefined) {
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
                    }
                }
            });
            insertMany(data.ac);
            return data.ac;
        }
        return [];
    } catch (err) {
        console.error(`Error fetching flights for area ${lat},${lon}:`, err.message);
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
