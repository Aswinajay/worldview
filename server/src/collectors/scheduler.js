const cron = require('node-cron');
const opensky = require('./opensky');
const celestrak = require('./celestrak');
const maritime = require('./maritime');
const earthquakes = require('./earthquakes');
const eonet = require('./eonet');
const airports = require('./airports');
const maritimeInfra = require('./maritime_infra');
const db = require('../db/database');

// Curated major international routes (Top 40)
const MAJOR_ROUTES = [
    ['KJFK', 'EGLL'], ['EGLL', 'OMDB'], ['OMDB', 'WSSS'], ['WSSS', 'YMML'],
    ['KLAX', 'RJTT'], ['RJTT', 'VHHH'], ['VHHH', 'YSSY'], ['EGLL', 'LFPG'],
    ['LFPG', 'EDDF'], ['EDDF', 'UUEE'], ['UUEE', 'ZBAA'], ['ZBAA', 'RJTT'],
    ['SBGR', 'LEMD'], ['LEMD', 'EGLL'], ['KORD', 'KJFK'], ['EBBR', 'LFPG'],
    ['FAOR', 'EGLL'], ['FACT', 'FAOR'], ['OMDB', 'VIDP'], ['WSSS', 'YMML'],
    ['EGLL', 'EHAM'], ['EHAM', 'EDDF'], ['ZSPD', 'VHHH'], ['VHHH', 'ZBAA'],
    ['KDFW', 'KORD'], ['KLAX', 'KSFO'], ['KLAX', 'KSEA'], ['KSEA', 'PANC'],
    ['PANC', 'RJTT'], ['EGLL', 'KIAD'], ['EGLL', 'KBOS'], ['EDDF', 'VMMC'],
    ['OMDB', 'VABB'], ['OMDB', 'WSSS'], ['WSSS', 'WIII'], ['WIII', 'YSSY'],
    ['KJFK', 'MMMX'], ['MMMX', 'SCEL'], ['SCEL', 'SAEZ'], ['SAEZ', 'SBGR']
];

const seedRoutes = () => {
    const insert = db.prepare('INSERT OR IGNORE INTO global_routes (origin_icao, dest_icao, usage_score) VALUES (?, ?, ?)');
    MAJOR_ROUTES.forEach(([o, d]) => insert.run(o, d, 100));
};

// Initialize all background collection jobs
const startScheduler = () => {
    console.log('Starting background data collectors...');

    // Scrape flights every 60 seconds to avoid OpenSky Free limits
    cron.schedule('*/60 * * * * *', () => {
        opensky.fetchFlights();
    });

    // Maritime AIS every 60 seconds
    cron.schedule('*/60 * * * * *', () => {
        maritime.fetchMaritime();
    });

    // TLE data every 4 hours
    cron.schedule('0 */4 * * *', () => {
        celestrak.fetchTLEs();
    });

    // USGS Earthquakes every 10 minutes
    cron.schedule('*/10 * * * *', () => {
        earthquakes.fetchEarthquakes();
    });

    // NASA EONET every 30 minutes
    cron.schedule('*/30 * * * *', () => {
        eonet.fetchEonet();
    });

    // Seed airports and routes once
    airports.syncAirports();
    maritimeInfra.syncMaritimeInfra();
    seedRoutes();

    // Do first fetches immediately
    opensky.fetchFlights();
    maritime.fetchMaritime();
    celestrak.fetchTLEs();
    earthquakes.fetchEarthquakes();
    eonet.fetchEonet();
};

module.exports = { startScheduler };
