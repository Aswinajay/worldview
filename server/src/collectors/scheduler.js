const cron = require('node-cron');
const opensky = require('./opensky');
const celestrak = require('./celestrak');
const maritime = require('./maritime');
const earthquakes = require('./earthquakes');
const eonet = require('./eonet');

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

    // Do first fetches immediately
    opensky.fetchFlights();
    maritime.fetchMaritime();
    celestrak.fetchTLEs();
    earthquakes.fetchEarthquakes();
    eonet.fetchEonet();
};

module.exports = { startScheduler };
