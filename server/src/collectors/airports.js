const fs = require('fs');
const path = require('path');
const db = require('../db/database');

const AIRPORTS_PATH = path.resolve(__dirname, '../../data/airports.dat');

const syncAirports = () => {
    console.log(`[${new Date().toISOString()}] Syncing airport database...`);

    if (!fs.existsSync(AIRPORTS_PATH)) {
        console.error('Airports data file missing.');
        return;
    }

    const data = fs.readFileSync(AIRPORTS_PATH, 'utf8');
    const lines = data.split('\n');

    // Create table if not exists
    db.exec(`
        CREATE TABLE IF NOT EXISTS airports (
            id INTEGER PRIMARY KEY,
            name TEXT,
            city TEXT,
            country TEXT,
            iata TEXT,
            icao TEXT,
            latitude REAL,
            longitude REAL,
            altitude REAL
        )
    `);

    const insertStmt = db.prepare(`
        REPLACE INTO airports (id, name, city, country, iata, icao, latitude, longitude, altitude)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction((rows) => {
        for (const row of rows) {
            const parts = row.split(',').map(p => p.replace(/"/g, ''));
            if (parts.length < 9) continue;

            const id = parseInt(parts[0]);
            const name = parts[1];
            const city = parts[2];
            const country = parts[3];
            const iata = parts[4] === '\\N' ? null : parts[4];
            const icao = parts[5] === '\\N' ? null : parts[5];
            const lat = parseFloat(parts[6]);
            const lon = parseFloat(parts[7]);
            const alt = parseFloat(parts[8]);

            if (!isNaN(lat) && !isNaN(lon)) {
                insertStmt.run(id, name, city, country, iata, icao, lat, lon, alt);
            }
        }
    });

    transaction(lines);
    console.log(`Synchronized ${lines.length} airport records.`);
};

module.exports = { syncAirports };
