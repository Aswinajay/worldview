const cron = require('node-cron');
const opensky = require('./opensky');
const celestrak = require('./celestrak');
const maritime = require('./maritime');

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

    // Do first fetches immediately
    opensky.fetchFlights();
    maritime.fetchMaritime();
    celestrak.fetchTLEs();
};

module.exports = { startScheduler };
