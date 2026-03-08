const db = require('../db/database');

// Top 25 Global Ports
const PORTS = [
    { name: 'Shanghai', city: 'Shanghai', country: 'China', code: 'CNSHG', lat: 31.2304, lon: 121.4737 },
    { name: 'Singapore', city: 'Singapore', country: 'Singapore', code: 'SGSIN', lat: 1.2897, lon: 103.8501 },
    { name: 'Ningbo-Zhoushan', city: 'Ningbo', country: 'China', code: 'CNNGB', lat: 29.8683, lon: 121.5440 },
    { name: 'Shenzhen', city: 'Shenzhen', country: 'China', code: 'CNSZX', lat: 22.5431, lon: 114.0579 },
    { name: 'Guangzhou', city: 'Guangzhou', country: 'China', code: 'CNCAN', lat: 23.1291, lon: 113.2644 },
    { name: 'Busan', city: 'Busan', country: 'South Korea', code: 'KRPUS', lat: 35.1796, lon: 129.0756 },
    { name: 'Hong Kong', city: 'Hong Kong', country: 'China', code: 'HKHKG', lat: 22.3193, lon: 114.1694 },
    { name: 'Qingdao', city: 'Qingdao', country: 'China', code: 'CNTAO', lat: 36.0671, lon: 120.3826 },
    { name: 'Tianjin', city: 'Tianjin', country: 'China', code: 'CNTSN', lat: 39.1257, lon: 117.1902 },
    { name: 'Dubai/Jebel Ali', city: 'Dubai', country: 'UAE', code: 'AEJEA', lat: 24.9857, lon: 55.0747 },
    { name: 'Rotterdam', city: 'Rotterdam', country: 'Netherlands', code: 'NLRTM', lat: 51.9225, lon: 4.4792 },
    { name: 'Port Klang', city: 'Port Klang', country: 'Malaysia', code: 'MYPKG', lat: 3.0011, lon: 101.3922 },
    { name: 'Antwerp-Bruges', city: 'Antwerp', country: 'Belgium', code: 'BEANR', lat: 51.2213, lon: 4.4051 },
    { name: 'Xiamen', city: 'Xiamen', country: 'China', code: 'CNXMN', lat: 24.4798, lon: 118.0894 },
    { name: 'Los Angeles', city: 'Los Angeles', country: 'USA', code: 'USLAX', lat: 33.7288, lon: -118.2620 },
    { name: 'Tanjung Pelepas', city: 'Johor', country: 'Malaysia', code: 'MYTPP', lat: 1.3667, lon: 103.5500 },
    { name: 'Colombo', city: 'Colombo', country: 'Sri Lanka', code: 'LKCMB', lat: 6.9497, lon: 79.8437 },
    { name: 'Laem Chabang', city: 'Chonburi', country: 'Thailand', code: 'THLCH', lat: 13.0833, lon: 100.9167 },
    { name: 'Ho Chi Minh City', city: 'Ho Chi Minh', country: 'Vietnam', code: 'VNSGN', lat: 10.7627, lon: 106.6602 },
    { name: 'Alexandria', city: 'Alexandria', country: 'Egypt', code: 'EGALY', lat: 31.2001, lon: 29.9187 },
    { name: 'Valencia', city: 'Valencia', country: 'Spain', code: 'ESVLC', lat: 39.4699, lon: -0.3763 },
    { name: 'Piraeus', city: 'Athens', country: 'Greece', code: 'GRPIR', lat: 37.9475, lon: 23.6461 },
    { name: 'Santos', city: 'Santos', country: 'Brazil', code: 'BRSSZ', lat: -23.9618, lon: -46.3322 },
    { name: 'Algeciras', city: 'Algeciras', country: 'Spain', code: 'ESALG', lat: 36.1408, lon: -5.4562 },
    { name: 'New York/New Jersey', city: 'New York', country: 'USA', code: 'USNYC', lat: 40.7128, lon: -74.0060 }
];

// Major Maritime Routes (Primary Lanes)
const MARITIME_ROUTES = [
    ['CNSHG', 'SGSIN'], ['SGSIN', 'MYPKG'], ['MYPKG', 'LKCMB'], ['LKCMB', 'AEJEA'],
    ['AEJEA', 'EGALY'], ['EGALY', 'GRPIR'], ['GRPIR', 'ESVLC'], ['ESVLC', 'ESALG'],
    ['ESALG', 'NLRTM'], ['NLRTM', 'BEANR'], ['SGSIN', 'CNNGB'], ['CNNGB', 'CNSZX'],
    ['CNSZX', 'HKHKG'], ['HKHKG', 'KRPUS'], ['CNSHG', 'USLAX'], ['USLAX', 'USNYC'],
    ['USNYC', 'NLRTM'], ['SGSIN', 'YSSY'], ['YSSY', 'USLAX'], ['KRPUS', 'CNTAO'],
    ['CNTAO', 'CNTSN'], ['SGSIN', 'VNSGN'], ['VNSGN', 'THLCH'], ['SGSIN', 'MYTPP'],
    ['EGALY', 'VALENCIA'], ['ESALG', 'BRSSZ'], ['BRSSZ', 'NLRTM']
];

const syncMaritimeInfra = () => {
    console.log(`[${new Date().toISOString()}] Syncing maritime infrastructure...`);

    db.transaction(() => {
        const portStmt = db.prepare(`
            INSERT OR REPLACE INTO ports (name, city, country, code, latitude, longitude)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        for (const port of PORTS) {
            portStmt.run(port.name, port.city, port.country, port.code, port.lat, port.lon);
        }

        const routeStmt = db.prepare(`
            INSERT OR IGNORE INTO maritime_routes (origin_code, dest_code, usage_score)
            VALUES (?, ?, ?)
        `);
        for (const [o, d] of MARITIME_ROUTES) {
            routeStmt.run(o, d, 100);
        }
    })();

    console.log(`Synchronized ${PORTS.length} ports and ${MARITIME_ROUTES.length} shipping lanes.`);
};

module.exports = { syncMaritimeInfra };
