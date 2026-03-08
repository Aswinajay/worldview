import React, { useMemo } from 'react';
import { Play, Pause, SkipBack, Clock } from 'lucide-react';

const Timeline = ({ currentTime, setCurrentTime, isPlaying, setIsPlaying, playbackSpeed, setPlaybackSpeed, goLive }) => {
    const isLive = currentTime === null;

    // Map slider 0-100 to -24h..now
    const sliderValue = useMemo(() => {
        if (isLive) return 100;
        const now = Date.now();
        const ms24h = 24 * 60 * 60 * 1000;
        const diff = now - currentTime.getTime();
        return Math.max(0, Math.min(100, 100 - (diff / ms24h) * 100));
    }, [currentTime, isLive]);

    const handleSliderChange = (e) => {
        const val = Number(e.target.value);
        if (val >= 99.5) {
            goLive();
        } else {
            const now = Date.now();
            const ms24h = 24 * 60 * 60 * 1000;
            const targetMs = now - ((100 - val) / 100) * ms24h;
            setCurrentTime(new Date(targetMs));
            setIsPlaying(false);
        }
    };

    const timeLabel = useMemo(() => {
        if (isLive) return 'LIVE';
        return currentTime.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
    }, [currentTime, isLive]);

    return (
        <div className="timeline-container glass-panel">
            <div className="playback-controls" style={{ display: 'flex', gap: '10px', alignItems: 'center', marginRight: '20px' }}>
                <button style={btnStyle} onClick={goLive} title="Go Live">
                    <SkipBack size={16} />
                </button>
                <button
                    style={{
                        ...btnStyle, width: '40px', height: '40px', borderRadius: '50%',
                        background: isPlaying ? 'var(--color-warning)' : 'var(--color-accent)', color: '#000'
                    }}
                    onClick={() => {
                        if (isLive) {
                            // Start replay from 1 hour ago
                            setCurrentTime(new Date(Date.now() - 3600000));
                        }
                        setIsPlaying(!isPlaying);
                    }}
                >
                    {isPlaying ? <Pause fill="#000" size={18} /> : <Play fill="#000" size={18} />}
                </button>

                <div style={{ display: 'flex', background: 'rgba(255,255,255,0.08)', borderRadius: '12px', overflow: 'hidden' }}>
                    {[1, 10, 100].map(s => (
                        <button
                            key={s}
                            onClick={() => setPlaybackSpeed(s)}
                            style={{
                                ...btnStyle, borderRadius: 0, fontSize: '11px',
                                background: playbackSpeed === s ? 'rgba(255,255,255,0.2)' : 'transparent',
                                fontWeight: playbackSpeed === s ? 700 : 400
                            }}
                        >
                            {s}x
                        </button>
                    ))}
                </div>
            </div>

            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>-24h</span>
                <input
                    type="range"
                    min="0"
                    max="100"
                    step="0.1"
                    value={sliderValue}
                    onChange={handleSliderChange}
                    style={{ flex: 1, accentColor: 'var(--color-accent)' }}
                />
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap',
                    fontSize: '12px',
                    color: isLive ? 'var(--color-success)' : 'var(--color-warning)',
                    fontWeight: 600, fontFamily: 'monospace'
                }}>
                    <Clock size={12} />
                    {timeLabel}
                </div>
            </div>
        </div>
    );
};

const btnStyle = {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    padding: '6px 10px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: '4px',
    transition: 'background 0.2s'
};

export default Timeline;
