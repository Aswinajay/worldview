import React from 'react';
import { Plane, Ship, Satellite, WifiOff, AlertTriangle, Radio, MapPin, Menu, X, Activity, CloudLightning, Anchor } from 'lucide-react';

const LayerPanel = ({ layers, toggleLayer, setBaseLayer, layerCounts, status }) => {
    const [collapsed, setCollapsed] = React.useState(false);

    return (
        <>
            {/* Mobile hamburger */}
            <button className="mobile-menu-btn" onClick={() => setCollapsed(!collapsed)}>
                {collapsed ? <X size={20} /> : <Menu size={20} />}
            </button>

            <div className={`layer-panel glass-panel slide-in-left ${collapsed ? 'open' : ''}`} style={{ borderRight: '2px solid var(--color-accent)' }}>
                <h2 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '3px', color: 'var(--color-accent)', marginBottom: '20px', fontWeight: 800 }}>
                    MISSION PARAMETERS
                </h2>

                <div className="layer-section" style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '10px', marginBottom: '12px', color: 'var(--text-secondary)', letterSpacing: '1px' }}>TERRAIN VISUALIZATION</h3>
                    <div style={{ display: 'flex', gap: '4px' }}>
                        {['satellite', 'terrain', 'dark'].map(type => (
                            <button
                                key={type}
                                onClick={() => setBaseLayer(type)}
                                style={{
                                    flex: 1, padding: '8px 4px', fontSize: '9px', textTransform: 'uppercase',
                                    background: layers.baseLayer === type ? 'var(--color-accent)' : 'rgba(51,255,0,0.05)',
                                    color: layers.baseLayer === type ? '#000' : 'var(--color-accent)',
                                    border: `1px solid ${layers.baseLayer === type ? 'var(--color-accent)' : 'rgba(51,255,0,0.2)'}`,
                                    borderRadius: '2px', cursor: 'pointer',
                                    fontWeight: 800,
                                    transition: 'all 0.1s ease',
                                    letterSpacing: '1px'
                                }}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="layer-section">
                    <h3 style={{ fontSize: '10px', marginBottom: '12px', color: 'var(--text-secondary)', letterSpacing: '1px' }}>OPERATIONAL OVERLAYS</h3>

                    <LayerToggle
                        id="flights"
                        icon={<Plane size={16} />}
                        label="AERIAL ASSETS (ADSB)"
                        active={layers.flights}
                        onToggle={() => toggleLayer('flights')}
                        status={status?.flights || 'live'}
                        count={layerCounts.flights}
                        countLabel="TRACKED"
                    />

                    <LayerToggle
                        id="maritime"
                        icon={<Ship size={16} />}
                        label="NAVAL ASSETS (AIS)"
                        active={layers.maritime}
                        onToggle={() => toggleLayer('maritime')}
                        status={status?.maritime}
                        count={layerCounts.maritime}
                        countLabel="VESSELS"
                    />

                    <LayerToggle
                        id="satellites"
                        icon={<Satellite size={16} />}
                        label="ORBITAL DEPLOYMENT"
                        active={layers.satellites}
                        onToggle={() => toggleLayer('satellites')}
                        status={status?.satellites}
                        count={layerCounts.satellites}
                        countLabel="ASSETS"
                    />

                    <div style={{ height: '1px', background: 'rgba(51,255,0,0.15)', margin: '16px 0' }} />

                    <LayerToggle
                        id="earthquakes"
                        icon={<Activity size={16} />}
                        label="SEISMIC ACTIVITY"
                        active={layers.earthquakes}
                        onToggle={() => toggleLayer('earthquakes')}
                        status={status?.earthquakes}
                        count={layerCounts.earthquakes}
                        countLabel="EVENTS"
                    />

                    <LayerToggle
                        id="notams"
                        icon={<AlertTriangle size={16} />}
                        label="AIRSPACE ADVISORIES"
                        active={layers.notams}
                        onToggle={() => toggleLayer('notams')}
                        status={status?.notams}
                        count={layerCounts.notams}
                        countLabel="ACTIVE"
                    />

                    <LayerToggle
                        id="internet"
                        icon={<WifiOff size={16} />}
                        label="CYBER INFRASTRUCTURE"
                        active={layers.internet}
                        onToggle={() => toggleLayer('internet')}
                        status={status?.internet}
                        count={layerCounts.internet}
                        countLabel="REGIONS"
                    />

                    <LayerToggle
                        id="eonet"
                        icon={<CloudLightning size={16} />}
                        label="ENVIRONMENTAL INTEL"
                        active={layers.eonet}
                        onToggle={() => toggleLayer('eonet')}
                        status={status?.eonet}
                        count={layerCounts.eonet}
                        countLabel="ALERTS"
                    />

                    <div style={{ height: '1px', background: 'rgba(51,255,0,0.15)', margin: '16px 0' }} />

                    <LayerToggle
                        id="routes"
                        icon={<Radio size={16} />}
                        label="AERIAL CORRIDORS"
                        active={layers.routes}
                        onToggle={() => toggleLayer('routes')}
                        status={status?.routes}
                        countLabel="GLOBAL"
                    />

                    <LayerToggle
                        id="airports"
                        icon={<MapPin size={16} />}
                        label="STRATEGIC AIRFIELDS"
                        active={layers.airports}
                        onToggle={() => toggleLayer('airports')}
                        status={status?.airports}
                        count={layerCounts.airports}
                        countLabel="FACILITIES"
                    />

                    <div style={{ height: '1px', background: 'rgba(51,255,0,0.15)', margin: '16px 0' }} />

                    <LayerToggle
                        id="maritimeLanes"
                        icon={<Ship size={16} />}
                        label="MARITIME LANES"
                        active={layers.maritimeLanes}
                        onToggle={() => toggleLayer('maritimeLanes')}
                        status={status?.maritimeLanes}
                        countLabel="GLOBAL"
                    />

                    <LayerToggle
                        id="ports"
                        icon={<Anchor size={16} />}
                        label="LOGISTICS HUBS"
                        active={layers.ports}
                        onToggle={() => toggleLayer('ports')}
                        status={status?.ports}
                        count={layerCounts.ports}
                        countLabel="PORTS"
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
