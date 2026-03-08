const sqlite = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, '../../data');
if (!fs.existsSync(dbPath)) {
    fs.mkdirSync(dbPath, { recursive: true });
}

// Connect to SQLite db
const db = sqlite(path.join(dbPath, 'worldview.sqlite'));
db.pragma('journal_mode = WAL'); // Better concurrency

// Initialize schema if not exists
const schemaPath = path.resolve(__dirname, 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');
db.exec(schema);

module.exports = db;
