# WorldView — 4D Geospatial Intelligence Dashboard

A browser-based 4D geospatial intelligence platform with live data layers, time-travel replay, and dark glassmorphism UI.

## Quick Start

### Prerequisites
- Node.js 18+
- npm

### Development

```bash
# Terminal 1: Start the backend
cd server
npm install
npm run dev

# Terminal 2: Start the frontend
cd client
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

### Docker

```bash
docker-compose up --build
```

Open http://localhost:3001.

## Features

### Data Layers
| Layer | Source | Update Frequency |
|-------|--------|-----------------|
| ADS-B Flights | OpenSky Network API | 15 seconds |
| AIS Maritime | Simulated demo data | 60 seconds |
| Satellite Orbits | CelesTrak TLEs + satellite.js | 4 hours (TLE refresh) |
| GPS Jamming | Simulated hotspot data | Static |
| Airspace NOTAMs | Simulated conflict zones | Static |
| Internet Outages | Simulated IODA-style data | Static |
| Conflict Markers | REST API (CRUD) | 30 seconds |

### 4D Replay
- Timeline slider scrubs through last 24 hours of data
- Playback speeds: 1x, 10x, 100x
- All time-series layers sync to the selected timestamp

### API Endpoints
- `GET /api/flights?time=ISO` — Aircraft positions (live or historical)
- `GET /api/maritime` — Ship positions
- `GET /api/satellites` — Cached TLE data
- `GET /api/events` — Conflict/event markers
- `POST /api/events` — Create a new event marker
- `GET /api/snapshot?time=ISO` — All layer states at a timestamp
- `GET /api/health` — Server healthcheck

## Tech Stack
- **Frontend**: React + Vite + CesiumJS
- **Backend**: Express.js + better-sqlite3
- **Satellite Math**: satellite.js (SGP4 propagation)
- **Scheduling**: node-cron
- **Styling**: Dark glassmorphism CSS
- **Deployment**: Docker

## Configuration

### Cesium Ion Token (Optional)
For enhanced satellite imagery, edit `client/src/components/Globe.jsx`:
```js
Cesium.Ion.defaultAccessToken = 'YOUR_TOKEN_HERE';
```
The app works without a token using free OpenStreetMap tiles.

## License
MIT
