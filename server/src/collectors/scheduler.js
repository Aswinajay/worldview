const cron = require('node-cron');
const opensky = require('./opensky');

// Initialize all background collection jobs
const startScheduler = () => {
    console.log('Starting background data collectors...');

    // NOTE: OpenSky free tier unauthenticated rate limit is roughly every 10 seconds.
    // We'll query every 15 seconds to be safe.

    // Scrape flights every 15 seconds
    cron.schedule('*/15 * * * * *', () => {
        opensky.fetchFlights();
    });

    // Do a first fetch immediately
    opensky.fetchFlights();
};

module.exports = { startScheduler };
