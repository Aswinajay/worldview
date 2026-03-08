import React, { useState, useEffect } from 'react';

const Header = () => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="app-header glass-panel">
            <div className="app-title" style={{ fontWeight: 600, color: 'var(--color-accent)' }}>
                WORLDVIEW
            </div>
            <div className="time-display">
                {time.toISOString().replace('T', ' ').substring(0, 19)} UTC
            </div>
            <div className="coord-display" style={{ color: 'var(--text-secondary)' }}>
                {/* Placeholder for cursor coordinates */}
                LAT 00.0000° LON 000.0000°
            </div>
        </div>
    );
};

export default Header;
