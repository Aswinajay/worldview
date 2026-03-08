const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Import Routes
const flightsRoute = require('./routes/flights');
const snapshotRoute = require('./routes/snapshot');
const maritimeRoute = require('./routes/maritime');
const satellitesRoute = require('./routes/satellites');
const eventsRoute = require('./routes/events');
const searchRoute = require('./routes/search');
const earthquakesRoute = require('./routes/earthquakes');
const eonetRoute = require('./routes/eonet');

// Mount Routes
app.use('/api/flights', flightsRoute);
app.use('/api/snapshot', snapshotRoute);
app.use('/api/maritime', maritimeRoute);
app.use('/api/satellites', satellitesRoute);
app.use('/api/events', eventsRoute);
app.use('/api/search', searchRoute);
app.use('/api/earthquakes', earthquakesRoute);
app.use('/api/eonet', eonetRoute);

// Collectors
const { startScheduler } = require('./collectors/scheduler');
startScheduler();

// Healthcheck
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production' || process.env.SERVE_CLIENT === 'true') {
    const clientPath = path.join(__dirname, '../../client/dist');
    app.use(express.static(clientPath));
    app.use((req, res, next) => {
        if (!req.path.startsWith('/api/')) {
            res.sendFile(path.join(clientPath, 'index.html'));
        } else {
            next();
        }
    });
}

// Start Server
app.listen(PORT, () => {
    console.log(`WorldView API server running on port ${PORT}`);
});
