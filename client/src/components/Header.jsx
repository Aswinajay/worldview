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
        <div className="app-header glass-panel fade-in" style={{ borderLeft: '4px solid var(--color-warning)' }}>
            <div className="app-title" style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
                <span style={{ fontWeight: 800, color: 'var(--color-accent)', letterSpacing: '2px', fontSize: '16px' }}>
                    WORLDVIEW
                </span>
                <span style={{ fontSize: '9px', color: 'var(--text-secondary)', letterSpacing: '1px' }}>
                    TACTICAL INTELLIGENCE SUITE // CLASSIFIED
                </span>
            </div>

            {/* Tactical Search */}
            <div className="search-container" style={{ position: 'relative', flex: '0 1 300px' }}>
                <div style={{
                    display: 'flex', alignItems: 'center', background: 'rgba(0,255,0,0.03)',
                    borderRadius: '4px', padding: '4px 10px', border: '1px solid var(--border-glass)'
                }}>
                    <Search size={14} style={{ color: 'var(--color-accent)', marginRight: '8px' }} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => onSearch(e.target.value)}
                        placeholder="IDENTIFY ASSET (ICAO / MMSI)..."
                        style={{
                            background: 'transparent', border: 'none', outline: 'none',
                            color: 'var(--text-primary)', fontSize: '11px', width: '100%',
                            fontFamily: 'var(--font-sans)', letterSpacing: '1px'
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
                        background: 'rgba(5,7,5,0.98)', border: '1px solid var(--color-accent)',
                        borderRadius: '4px', maxHeight: '200px', overflowY: 'auto', zIndex: 100,
                        backdropFilter: 'blur(12px)', boxShadow: '0 10px 40px rgba(0,255,0,0.1)'
                    }}>
                        {searchResults.map((r, i) => (
                            <div key={i} onClick={() => onSelectResult(r)}
                                style={{
                                    padding: '10px 12px', cursor: 'pointer', fontSize: '11px',
                                    borderBottom: '1px solid rgba(51,255,0,0.1)',
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    transition: 'all 0.1s ease'
                                }}
                                onMouseEnter={e => e.target.style.background = 'rgba(51,255,0,0.1)'}
                                onMouseLeave={e => e.target.style.background = 'transparent'}
                            >
                                <span style={{ color: 'var(--color-accent)', display: 'flex' }}>
                                    {r.type === 'flight' ? <Plane size={12} /> : r.type === 'ship' ? <Ship size={12} /> : <MapPin size={12} />}
                                </span>
                                <span style={{ fontWeight: 700, letterSpacing: '2px' }}>{String(r.name || r.callsign || r.ship_name).toUpperCase()}</span>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '9px', marginLeft: 'auto' }}>
                                    [{r.type.toUpperCase()}]
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="system-status" style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                <div className="time-display" style={{ fontSize: '12px', letterSpacing: '1px' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>UTC_TIME:</span> {displayTime.toISOString().replace('T', ' ').substring(0, 19)}
                </div>

                <div className="coord-display" style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                    <span style={{ opacity: 0.6 }}>POS:</span> {(mouseCoords.lat || 0).toFixed(4)}N / {(mouseCoords.lon || 0).toFixed(4)}E
                </div>
            </div>

            {/* Live Indicator */}
            {isLive && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,255,0,0.05)', padding: '4px 10px', borderRadius: '4px', border: '1px solid var(--color-success)' }}>
                    <span className="status-dot live pulse" />
                    <span style={{ color: 'var(--color-success)', fontWeight: 800, fontSize: '10px', letterSpacing: '2px' }}>REAL-TIME FEED</span>
                </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={onLocate} className="header-btn" title="TACTICAL CENTER" style={{ color: 'var(--color-accent)' }}>
                    <MapPin size={16} />
                </button>
                <button onClick={onScreenshot} className="header-btn" title="EXPORT INTEL (PNG)">
                    <Camera size={16} />
                </button>
                <button onClick={onShare} className="header-btn" title="ENCRYPTED SHARE">
                    <Link2 size={16} />
                </button>
            </div>
        </div>
    );
};

export default Header;
