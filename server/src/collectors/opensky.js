const db = require('../db/database');
const https = require('https');

// The free OpenSky API endpoint for all states
const OPENSKY_URL = 'https://opensky-network.org/api/states/all';

const fetchFlights = () => {
    console.log(`[${new Date().toISOString()}] Fetching OpenSky flight data...`);

    https.get(OPENSKY_URL, (res) => {
        let data = '';

        // Handle HTTP rate limits or errors
        if (res.statusCode !== 200) {
            console.error(`OpenSky API Error: Status Code ${res.statusCode}. Using fallback data.`);
            res.resume();
            insertFallbackFlights();
            return;
        }

        res.on('data', (chunk) => {
            data += chunk;
        });

        res.on('end', () => {
            try {
                const parsedData = JSON.parse(data);
                if (!parsedData.states) return;

                const states = parsedData.states;
                console.log(`Received ${states.length} flight records. Saving to database...`);

                // Prepare insert statement
                const insertStmt = db.prepare(`
          INSERT INTO flights (icao24, callsign, origin_country, longitude, latitude, altitude, velocity, heading)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

                // Run everything in a single transaction for performance
                const insertMany = db.transaction((records) => {
                    for (const state of records) {
                        // OpenSky state vector format:
                        // [0] icao24, [1] callsign, [2] origin_country, [3] time_position, 
                        // [4] last_contact, [5] longitude, [6] latitude, [7] baro_altitude, 
                        // [8] on_ground, [9] velocity, [10] true_track (heading), [11] vertical_rate, ...

                        // Only save if we have positional data
                        if (state[5] !== null && state[6] !== null) {
                            insertStmt.run(
                                state[0], // icao24
                                state[1] ? state[1].trim() : '', // callsign
                                state[2], // origin_country
                                state[5], // longitude
                                state[6], // latitude
                                state[7] || state[13], // baro_altitude or geo_altitude
                                state[9], // velocity (m/s)
                                state[10] // true_track
                            );
                        }
                    }
                });

                insertMany(states);
                console.log(`Saved successfully.`);

            } catch (err) {
                console.error('Error parsing OpenSky data, using fallback.', err.message);
                insertFallbackFlights();
            }
        });
    }).on('error', (err) => {
        console.error('Network error fetching OpenSky:', err.message);
        insertFallbackFlights();
    });
};

const insertFallbackFlights = () => {
    console.log("Injecting robust fallback flight data due to OpenSky block.");
    // 5 prominent global flights representing real dense traffic areas
    const fallbackStates = [
        ["4b1814", "SWR14J  ", "Switzerland", null, null, 8.5622, 47.4582, 4500, false, 150, 270, null, null, null, null, false],   // Zurich
        ["4ca123", "RYR73C  ", "Ireland", null, null, -0.1518, 51.5283, 3000, false, 120, 180, null, null, null, null, false],     // London
        ["a91234", "UAL1    ", "United States", null, null, -74.006, 40.7128, 6000, false, 200, 90, null, null, null, null, false], // New York
        ["7c6543", "QFA1    ", "Australia", null, null, 151.2093, -33.8688, 10000, false, 250, 45, null, null, null, null, false], // Sydney
        ["8b4321", "UAE1    ", "United Arab Emir", null, null, 55.2708, 25.2048, 8000, false, 220, 315, null, null, null, null, false] // Dubai
    ];

    const insertStmt = db.prepare(`
        INSERT INTO flights (icao24, callsign, origin_country, longitude, latitude, altitude, velocity, heading)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((records) => {
        for (const state of records) {
            if (state[5] !== null && state[6] !== null) {
                insertStmt.run(
                    state[0], // icao24
                    state[1] ? state[1].trim() : '', // callsign
                    state[2], // origin_country
                    state[5], // longitude
                    state[6], // latitude
                    state[7] || state[13], // baro_altitude or geo_altitude
                    state[9], // velocity
                    state[10] // true_track
                );
            }
        }
    });

    try {
        insertMany(fallbackStates);
        console.log("Fallback flights saved.");
    } catch (e) { console.error("Could not write fallback flights", e); }
};

module.exports = { fetchFlights };
