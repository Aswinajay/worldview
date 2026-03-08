const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const httpsAgent = new require('https').Agent({ family: 4, keepAlive: true });
const httpAgent = new require('http').Agent({ family: 4, keepAlive: true });

const EARTHQUAKES_CACHE = path.resolve(__dirname, '../../data/earthquakes_cache.json');

const fetchEarthquakes = async () => {
    console.log(`[${new Date().toISOString()}] Fetching USGS Earthquake data...`);
    try {
        // Fetch M2.5+ earthquakes from the past day
        const response = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson', {
            agent: (parsed) => parsed.protocol === 'http:' ? httpAgent : httpsAgent,
            headers: { 'User-Agent': 'WorldView/1.0' },
            timeout: 15000
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        const quakes = data.features.map(f => ({
            id: f.id,
            title: f.properties.title,
            magnitude: f.properties.mag,
            time: f.properties.time,
            longitude: f.geometry.coordinates[0],
            latitude: f.geometry.coordinates[1],
            depth: f.geometry.coordinates[2],
            url: f.properties.url
        }));

        fs.writeFileSync(EARTHQUAKES_CACHE, JSON.stringify(quakes, null, 2));
        console.log(`Saved ${quakes.length} earthquake records.`);
    } catch (err) {
        console.error('Error fetching USGS data:', err.message);
    }
};

module.exports = { fetchEarthquakes };
