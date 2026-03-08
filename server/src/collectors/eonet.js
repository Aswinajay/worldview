const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const EONET_CACHE = path.resolve(__dirname, '../../data/eonet_cache.json');

const fetchEonet = async () => {
    console.log(`[${new Date().toISOString()}] Fetching NASA EONET events data...`);
    try {
        const response = await fetch('https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=30', {
            headers: { 'User-Agent': 'WorldView/1.0' }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        // EONET returns complex geometries. We'll simplify to latest point.
        const events = data.events.map(event => {
            const latestGeometry = event.geometry[event.geometry.length - 1];
            // Skip if no point data (e.g. some polygons are too complex for our point map)
            if (!latestGeometry || latestGeometry.type !== 'Point') return null;

            return {
                id: event.id,
                title: event.title,
                category: event.categories[0]?.title || 'Unknown',
                time: latestGeometry.date,
                longitude: latestGeometry.coordinates[0],
                latitude: latestGeometry.coordinates[1]
            };
        }).filter(e => e !== null);

        fs.writeFileSync(EONET_CACHE, JSON.stringify(events, null, 2));
        console.log(`Saved ${events.length} NASA EONET events.`);
    } catch (err) {
        console.error('Error fetching NASA EONET data:', err.message);
    }
};

module.exports = { fetchEonet };
