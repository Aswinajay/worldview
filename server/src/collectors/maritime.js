const db = require('../db/database');

// Simulate maritime AIS data by generating demo ships at realistic positions
// In production, this would connect to AISHub or MarineTraffic API
const DEMO_SHIPS = [
    { mmsi: '211331640', name: 'MSC OSCAR', type: 'Container', lon: 1.3, lat: 51.9, heading: 45, speed: 12 },
    { mmsi: '636092123', name: 'EVER GIVEN', type: 'Container', lon: 32.3, lat: 30.0, heading: 180, speed: 8 },
    { mmsi: '538006692', name: 'OLYMPIC SPIRIT', type: 'Tanker', lon: -5.0, lat: 36.0, heading: 270, speed: 10 },
    { mmsi: '477654300', name: 'COSCO SHIPPING', type: 'Container', lon: 104.0, lat: 1.3, heading: 315, speed: 14 },
    { mmsi: '249110000', name: 'HARMONY SEAS', type: 'Passenger', lon: -80.1, lat: 25.7, heading: 120, speed: 18 },
    { mmsi: '538007834', name: 'PACIFIC VOYAGER', type: 'Tanker', lon: 140.0, lat: 35.6, heading: 90, speed: 11 },
    { mmsi: '311001200', name: 'BLUE HORIZON', type: 'Cargo', lon: -73.9, lat: 40.6, heading: 200, speed: 9 },
    { mmsi: '636019525', name: 'CAPE TOWN STAR', type: 'Cargo', lon: 18.4, lat: -33.9, heading: 150, speed: 13 },
    { mmsi: '219018319', name: 'MAERSK ELBA', type: 'Container', lon: 12.5, lat: 55.6, heading: 30, speed: 15 },
    { mmsi: '244780539', name: 'ROTTERDAM EXPRESS', type: 'Container', lon: 4.4, lat: 51.9, heading: 280, speed: 7 },
    { mmsi: '563000680', name: 'SINGAPORE STAR', type: 'Tanker', lon: 103.8, lat: 1.2, heading: 60, speed: 10 },
    { mmsi: '353136000', name: 'PANAMA EXPRESS', type: 'Cargo', lon: -79.5, lat: 8.9, heading: 340, speed: 12 },
];

const fetchMaritime = () => {
    console.log(`[${new Date().toISOString()}] Generating maritime AIS data...`);

    const insertStmt = db.prepare(`
    INSERT INTO maritime (mmsi, ship_name, ship_type, longitude, latitude, heading, speed)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

    const insertMany = db.transaction((ships) => {
        for (const ship of ships) {
            // Add slight random drift to simulate movement
            const drift = () => (Math.random() - 0.5) * 0.02;
            insertStmt.run(
                ship.mmsi,
                ship.name,
                ship.type,
                ship.lon + drift(),
                ship.lat + drift(),
                ship.heading + Math.random() * 5 - 2.5,
                ship.speed + Math.random() * 2 - 1
            );
        }
    });

    insertMany(DEMO_SHIPS);
    console.log(`Saved ${DEMO_SHIPS.length} maritime records.`);
};

module.exports = { fetchMaritime };
