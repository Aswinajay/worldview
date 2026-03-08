import React, { useState } from 'react';
import { Play, Pause, FastForward, SkipBack } from 'lucide-react';

const Timeline = () => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1);
    const [progress, setProgress] = useState(100); // 100% means current live time

    return (
        <div className="timeline-container glass-panel">
            <div className="playback-controls" style={{ display: 'flex', gap: '12px', alignItems: 'center', marginRight: '24px' }}>
                <button style={btnStyle} title="Live">
                    <SkipBack size={16} />
                </button>
                <button
                    style={{ ...btnStyle, width: '40px', height: '40px', borderRadius: '50%', background: 'var(--color-accent)', color: '#000' }}
                    onClick={() => setIsPlaying(!isPlaying)}
                >
                    {isPlaying ? <Pause fill="#000" size={18} /> : <Play fill="#000" size={18} />}
                </button>

                <div style={{ display: 'flex', background: 'rgba(255,255,255,0.1)', borderRadius: '12px', overflow: 'hidden' }}>
                    {[1, 10, 100].map(s => (
                        <button
                            key={s}
                            onClick={() => setSpeed(s)}
                            style={{
                                ...btnStyle,
                                borderRadius: 0,
                                background: speed === s ? 'rgba(255,255,255,0.2)' : 'transparent',
                                fontWeight: speed === s ? 600 : 400
                            }}
                        >
                            {s}x
                        </button>
                    ))}
                </div>
            </div>

            <div className="scrubber-wrapper" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>-24h</span>
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={progress}
                    onChange={(e) => setProgress(e.target.value)}
                    style={{ flex: 1, accentColor: 'var(--color-accent)' }}
                />
                <span style={{ fontSize: '12px', color: progress == 100 ? 'var(--color-success)' : 'var(--text-secondary)' }}>
                    {progress == 100 ? 'LIVE' : 'Historical'}
                </span>
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
