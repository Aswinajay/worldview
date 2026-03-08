-- /server/src/db/schema.sql
-- SQLite Schema for WorldView Intelligence Data

CREATE TABLE IF NOT EXISTS flights (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  icao24 TEXT NOT NULL,
  callsign TEXT,
  origin_country TEXT,
  longitude REAL,
  latitude REAL,
  altitude REAL,
  velocity REAL,
  heading REAL
);

-- Index for fast time-series retrieval
CREATE INDEX IF NOT EXISTS idx_flights_timestamp ON flights(timestamp);
CREATE INDEX IF NOT EXISTS idx_flights_icao ON flights(icao24);

-- Example tables for later layers (MVP just needs flights)
CREATE TABLE IF NOT EXISTS maritime (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  mmsi TEXT NOT NULL,
  ship_name TEXT,
  ship_type TEXT,
  longitude REAL,
  latitude REAL,
  heading REAL,
  speed REAL
);
CREATE INDEX IF NOT EXISTS idx_maritime_timestamp ON maritime(timestamp);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  type TEXT NOT NULL, -- 'notam', 'conflict', 'jamming'
  title TEXT,
  description TEXT,
  severity INTEGER,
  longitude REAL,
  latitude REAL,
  radius REAL -- for area events
);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);

-- Airport Database
CREATE TABLE IF NOT EXISTS airports (
    id INTEGER PRIMARY KEY,
    name TEXT,
    city TEXT,
    country TEXT,
    iata TEXT,
    icao TEXT,
    latitude REAL,
    longitude REAL,
    altitude REAL
);
CREATE INDEX IF NOT EXISTS idx_airports_icao ON airports(icao);
CREATE INDEX IF NOT EXISTS idx_airports_iata ON airports(iata);

-- Global Air Routes (Curated / Common Corridors)
CREATE TABLE IF NOT EXISTS global_routes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    origin_icao TEXT,
    dest_icao TEXT,
    usage_score INTEGER DEFAULT 0 -- For prioritizing thick vs thin lines
);

