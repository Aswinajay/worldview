const opensky = require('./opensky');
const celestrak = require('./celestrak');
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

// Initialize configuration (but do not ping APIs until zoomed)
const startScheduler = () => {
    console.log('[Tactical Mode] Background scrapers disabled. Relying entirely on On-Demand Sector Scanning.');

    // Seed airports and routes once (static data)
    airports.syncAirports();
    maritimeInfra.syncMaritimeInfra();
    seedRoutes();

    // We orbit calculations require TLEs, which are static catalogs. Fetching precisely once.
    celestrak.fetchTLEs();
};

module.exports = { startScheduler };
