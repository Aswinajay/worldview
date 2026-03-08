import React from 'react';
import { Plane, Ship, Satellite, WifiOff, AlertTriangle, Radio, MapPin, Menu, X } from 'lucide-react';

const LayerPanel = ({ layers, toggleLayer, setBaseLayer, layerCounts }) => {
    const [collapsed, setCollapsed] = React.useState(false);

    return (
        <>
            {/* Mobile hamburger */}
            <button className="mobile-menu-btn" onClick={() => setCollapsed(!collapsed)}>
                {collapsed ? <X size={20} /> : <Menu size={20} />}
            </button>

            <div className={`layer-panel glass-panel ${collapsed ? 'open' : ''}`}>
                <h2 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                    Intelligence Layers
                </h2>

                <div className="layer-section" style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '12px', marginBottom: '12px', color: 'var(--text-secondary)' }}>BASE MAP</h3>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {['satellite', 'terrain', 'dark'].map(type => (
                            <button
                                key={type}
                                onClick={() => setBaseLayer(type)}
                                style={{
                                    flex: 1, padding: '6px', fontSize: '11px', textTransform: 'capitalize',
                                    background: layers.baseLayer === type ? 'var(--color-accent)' : 'rgba(255,255,255,0.05)',
                                    color: layers.baseLayer === type ? '#000' : '#fff',
                                    border: 'none', borderRadius: '4px', cursor: 'pointer',
                                    fontWeight: layers.baseLayer === type ? 600 : 400,
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="layer-section">
                    <h3 style={{ fontSize: '12px', marginBottom: '12px', color: 'var(--text-secondary)' }}>LIVE DATA OVERLAYS</h3>

                    <LayerToggle
                        id="flights"
                        icon={<Plane size={16} />}
                        label="ADS-B Flights"
                        active={layers.flights}
                        onToggle={() => toggleLayer('flights')}
                        status="live"
                        count={layerCounts.flights}
                        countLabel="tracked"
                    />

                    <LayerToggle
                        id="maritime"
                        icon={<Ship size={16} />}
                        label="AIS Maritime"
                        active={layers.maritime}
                        onToggle={() => toggleLayer('maritime')}
                        count={layerCounts.maritime}
                        countLabel="vessels"
                    />

                    <LayerToggle
                        id="satellites"
                        icon={<Satellite size={16} />}
                        label="Orbital Assets"
                        active={layers.satellites}
                        onToggle={() => toggleLayer('satellites')}
                        count={layerCounts.satellites}
                        countLabel="tracked"
                    />

                    <div style={{ height: '1px', background: 'var(--border-glass)', margin: '16px 0' }} />

                    <LayerToggle
                        id="gpsJam"
                        icon={<Radio size={16} />}
                        label="GPS Jamming"
                        active={layers.gpsJam}
                        onToggle={() => toggleLayer('gpsJam')}
                        count={layerCounts.gpsJam}
                        countLabel="zones"
                    />

                    <LayerToggle
                        id="notams"
                        icon={<AlertTriangle size={16} />}
                        label="Airspace NOTAMs"
                        active={layers.notams}
                        onToggle={() => toggleLayer('notams')}
                        count={layerCounts.notams}
                        countLabel="active"
                    />

                    <LayerToggle
                        id="internet"
                        icon={<WifiOff size={16} />}
                        label="Internet Outages"
                        active={layers.internet}
                        onToggle={() => toggleLayer('internet')}
                        count={layerCounts.internet}
                        countLabel="countries"
                    />

                    <LayerToggle
                        id="conflicts"
                        icon={<MapPin size={16} />}
                        label="Conflict Markers"
                        active={layers.conflicts}
                        onToggle={() => toggleLayer('conflicts')}
                        count={layerCounts.conflicts}
                        countLabel="events"
                    />
                </div>

                {/* Keyboard shortcuts hint */}
                <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border-glass)', fontSize: '10px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                    <div style={{ fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>Shortcuts</div>
                    <div>⎵ Space — Play/Pause</div>
                    <div>← → — Scrub ±1 hour</div>
                    <div>↑ ↓ — Playback speed</div>
                    <div>R — Reset view</div>
                    <div>L — Go live</div>
                </div>
            </div>
        </>
    );
};

const LayerToggle = ({ id, icon, label, active, onToggle, status, count, countLabel }) => (
    <div className={`layer-item ${active ? 'active' : ''}`} onClick={onToggle}>
        <div className="layer-icon-title">
            <span style={{ color: active ? 'var(--color-accent)' : 'var(--text-secondary)' }}>
                {icon}
            </span>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '13px', fontWeight: active ? 500 : 400, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {label}
                    {status === 'live' && active && <span className="status-dot live pulse" title="Receiving live data" />}
                </span>
                {active && count !== undefined && (
                    <span style={{ fontSize: '10px', color: 'var(--color-accent)', fontWeight: 600, marginTop: '2px' }}>
                        {typeof count === 'number' ? count.toLocaleString() : count} {countLabel}
                    </span>
                )}
            </div>
        </div>
        <label className="switch" onClick={e => e.stopPropagation()}>
            <input type="checkbox" checked={active} onChange={onToggle} />
            <span className="slider"></span>
        </label>
    </div>
);

export default LayerPanel;
