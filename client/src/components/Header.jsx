import React, { useState, useEffect } from 'react';
import { Camera, Link2, Search, X, Plane, Ship, MapPin } from 'lucide-react';

const Header = ({ mouseCoords, currentTime, isLive, onScreenshot, onShare, onLocate, searchQuery, onSearch, searchResults, onSelectResult }) => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const displayTime = currentTime || time;

    return (
        <div className="app-header glass-panel fade-in">
            <div className="app-title" style={{ fontWeight: 700, color: 'var(--color-accent)', letterSpacing: '3px', fontSize: '15px' }}>
                WORLDVIEW
            </div>

            {/* Search Bar */}
            <div className="search-container" style={{ position: 'relative', flex: '0 1 260px' }}>
                <div style={{
                    display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.06)',
                    borderRadius: '6px', padding: '4px 10px', border: '1px solid var(--border-glass)'
                }}>
                    <Search size={14} style={{ color: 'var(--text-secondary)', marginRight: '6px' }} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => onSearch(e.target.value)}
                        placeholder="Search flights, ships..."
                        style={{
                            background: 'transparent', border: 'none', outline: 'none',
                            color: 'var(--text-primary)', fontSize: '12px', width: '100%',
                            fontFamily: 'var(--font-sans)'
                        }}
                    />
                    {searchQuery && (
                        <X size={14} style={{ cursor: 'pointer', color: 'var(--text-secondary)' }}
                            onClick={() => onSearch('')} />
                    )}
                </div>
                {searchResults.length > 0 && (
                    <div className="slide-up" style={{
                        position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px',
                        background: 'rgba(16,18,27,0.95)', border: '1px solid var(--border-glass)',
                        borderRadius: '6px', maxHeight: '200px', overflowY: 'auto', zIndex: 100,
                        backdropFilter: 'blur(12px)', boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                    }}>
                        {searchResults.map((r, i) => (
                            <div key={i} onClick={() => onSelectResult(r)}
                                style={{
                                    padding: '8px 12px', cursor: 'pointer', fontSize: '12px',
                                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.08)'}
                                onMouseLeave={e => e.target.style.background = 'transparent'}
                            >
                                <span style={{ color: 'var(--color-accent)', display: 'flex' }}>
                                    {r.type === 'flight' ? <Plane size={12} /> : r.type === 'ship' ? <Ship size={12} /> : <MapPin size={12} />}
                                </span>
                                <span style={{ fontWeight: 500 }}>{r.name || r.callsign || r.ship_name}</span>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '10px', marginLeft: 'auto', textTransform: 'uppercase' }}>
                                    {r.type}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="time-display" style={{ fontFamily: 'monospace', fontSize: '13px', letterSpacing: '1px', transition: 'all 0.3s ease' }}>
                {displayTime.toISOString().replace('T', ' ').substring(0, 19)} UTC
            </div>

            <div className="coord-display" style={{ color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: '12px', transition: 'all 0.3s ease' }}>
                <span style={{ opacity: 0.6 }}>LAT</span> {(mouseCoords.lat || 0).toFixed(4)}°
                <span style={{ opacity: 0.6, marginLeft: '8px' }}>LON</span> {(mouseCoords.lon || 0).toFixed(4)}°
            </div>

            {/* Live Indicator */}
            {isLive && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="status-dot live pulse" />
                    <span style={{ color: 'var(--color-success)', fontWeight: 700, fontSize: '11px', letterSpacing: '1px' }}>LIVE</span>
                </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '4px' }}>
                <button onClick={onLocate} className="header-btn" title="Locate My Position" style={{ color: 'var(--color-accent)' }}>
                    <MapPin size={16} />
                </button>
                <button onClick={onScreenshot} className="header-btn" title="Export Screenshot (PNG)">
                    <Camera size={16} />
                </button>
                <button onClick={onShare} className="header-btn" title="Copy Share URL">
                    <Link2 size={16} />
                </button>
            </div>
        </div>
    );
};

export default Header;
