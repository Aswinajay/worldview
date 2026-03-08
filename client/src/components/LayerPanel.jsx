import React from 'react';
import { Layers, Plane, Ship, Satellite, WifiOff, AlertTriangle, Radio } from 'lucide-react';

const LayerPanel = ({ layers, toggleLayer, setBaseLayer }) => {
    return (
        <div className="layer-panel glass-panel">
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
                                border: 'none', borderRadius: '4px', cursor: 'pointer'
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
                />

                <LayerToggle
                    id="maritime"
                    icon={<Ship size={16} />}
                    label="AIS Maritime"
                    active={layers.maritime}
                    onToggle={() => toggleLayer('maritime')}
                />

                <LayerToggle
                    id="satellites"
                    icon={<Satellite size={16} />}
                    label="Orbital Assets"
                    active={layers.satellites}
                    onToggle={() => toggleLayer('satellites')}
                />

                <div style={{ height: '1px', background: 'var(--border-glass)', margin: '16px 0' }} />

                <LayerToggle
                    id="gpsJam"
                    icon={<Radio size={16} />}
                    label="GPS Jamming"
                    active={layers.gpsJam}
                    onToggle={() => toggleLayer('gpsJam')}
                />

                <LayerToggle
                    id="notams"
                    icon={<AlertTriangle size={16} />}
                    label="Airspace NOTAMs"
                    active={layers.notams}
                    onToggle={() => toggleLayer('notams')}
                />

                <LayerToggle
                    id="internet"
                    icon={<WifiOff size={16} />}
                    label="Internet Outages"
                    active={layers.internet}
                    onToggle={() => toggleLayer('internet')}
                />
            </div>
        </div>
    );
};

const LayerToggle = ({ id, icon, label, active, onToggle, status }) => (
    <div className={`layer-item ${active ? 'active' : ''}`} onClick={onToggle}>
        <div className="layer-icon-title">
            <span style={{ color: active ? 'var(--color-accent)' : 'var(--text-secondary)' }}>
                {icon}
            </span>
            <span style={{ fontSize: '13px', fontWeight: active ? 500 : 400 }}>
                {label}
                {status === 'live' && active && <span className="status-dot live" title="Receiving live telemetry" />}
            </span>
        </div>
        <label className="switch" onClick={e => e.stopPropagation()}>
            <input type="checkbox" checked={active} onChange={onToggle} />
            <span className="slider"></span>
        </label>
    </div>
);

export default LayerPanel;
