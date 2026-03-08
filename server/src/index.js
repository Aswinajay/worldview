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

// Mount Routes
app.use('/api/flights', flightsRoute);
app.use('/api/snapshot', snapshotRoute);
app.use('/api/maritime', maritimeRoute);
app.use('/api/satellites', satellitesRoute);
app.use('/api/events', eventsRoute);

// Collectors
const { startScheduler } = require('./collectors/scheduler');
startScheduler();

// Healthcheck
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

// Start Server
app.listen(PORT, () => {
    console.log(`WorldView API server running on port ${PORT}`);
});
