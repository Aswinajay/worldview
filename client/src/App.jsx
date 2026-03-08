import React, { useState, useCallback, useEffect, useRef } from 'react';
import Globe from './components/Globe';
import LayerPanel from './components/LayerPanel';
import Timeline from './components/Timeline';
import Header from './components/Header';

function App() {
    const [layers, setLayers] = useState({
        baseLayer: 'dark',
        flights: true,
        maritime: false,
        satellites: false,
        earthquakes: false,
        notams: false,
        internet: false,
        eonet: false
    });

    // Time-travel state
    const [currentTime, setCurrentTime] = useState(null); // null = LIVE
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const playRef = useRef(null);

    // Mouse coordinates from globe
    const [mouseCoords, setMouseCoords] = useState({ lat: 0, lon: 0 });

    // Layer data counts
    const [layerCounts, setLayerCounts] = useState({});
    const [layerStates, setLayerStates] = useState({});

    // Search state
    const [searchResults, setSearchResults] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');

    // Viewer ref for screenshot / search
    const viewerRef = useRef(null);

    const toggleLayer = useCallback((layerId) => {
        setLayers(prev => ({ ...prev, [layerId]: !prev[layerId] }));
    }, []);

    const setBaseLayer = useCallback((layerId) => {
        setLayers(prev => ({ ...prev, baseLayer: layerId }));
    }, []);

    // Playback loop
    useEffect(() => {
        if (isPlaying && currentTime) {
            playRef.current = setInterval(() => {
                setCurrentTime(prev => {
                    const next = new Date(prev.getTime() + playbackSpeed * 1000);
                    if (next >= new Date()) {
                        setIsPlaying(false);
                        return null;
                    }
                    return next;
                });
            }, 1000);
        }
        return () => clearInterval(playRef.current);
    }, [isPlaying, playbackSpeed, currentTime]);

    const goLive = useCallback(() => {
        setCurrentTime(null);
        setIsPlaying(false);
    }, []);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            // ESC always works, even in input fields
            if (e.code === 'Escape') {
                e.preventDefault();
                setSearchQuery('');
                setSearchResults([]);
                if (e.target.tagName === 'INPUT') e.target.blur();
                return;
            }
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    if (currentTime === null) {
                        setCurrentTime(new Date(Date.now() - 3600000));
                    }
                    setIsPlaying(p => !p);
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    setCurrentTime(prev => {
                        const t = prev || new Date();
                        return new Date(t.getTime() - 3600000);
                    });
                    setIsPlaying(false);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    setCurrentTime(prev => {
                        if (!prev) return null;
                        const next = new Date(prev.getTime() + 3600000);
                        if (next >= new Date()) return null;
                        return next;
                    });
                    setIsPlaying(false);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setPlaybackSpeed(s => Math.min(100, s === 1 ? 10 : s === 10 ? 100 : 100));
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    setPlaybackSpeed(s => Math.max(1, s === 100 ? 10 : s === 10 ? 1 : 1));
                    break;
                case 'KeyR':
                    if (viewerRef.current) {
                        viewerRef.current.camera.flyHome(1.5);
                    }
                    break;
                case 'KeyL':
                    goLive();
                    break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentTime, goLive]);

    // Screenshot export
    const handleScreenshot = useCallback(() => {
        if (!viewerRef.current) return;
        const viewer = viewerRef.current;
        viewer.render();
        const canvas = viewer.scene.canvas;
        // Create a temp canvas with watermark
        const tmpCanvas = document.createElement('canvas');
        tmpCanvas.width = canvas.width;
        tmpCanvas.height = canvas.height;
        const ctx = tmpCanvas.getContext('2d');
        ctx.drawImage(canvas, 0, 0);
        // Watermark
        const ts = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
        ctx.font = '16px monospace';
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.textAlign = 'right';
        ctx.fillText(`WorldView — ${ts}`, canvas.width - 20, canvas.height - 20);
        // Download
        const link = document.createElement('a');
        link.download = `worldview_${ts}.png`;
        link.href = tmpCanvas.toDataURL('image/png');
        link.click();
    }, []);

    // Share URL
    const handleShare = useCallback(() => {
        const params = new URLSearchParams();
        if (currentTime) params.set('t', currentTime.toISOString());
        const activeLayers = Object.entries(layers)
            .filter(([k, v]) => v === true)
            .map(([k]) => k)
            .join(',');
        params.set('layers', activeLayers);
        if (viewerRef.current) {
            const cam = viewerRef.current.camera;
            const pos = cam.positionCartographic;
            if (pos) {
                const lat = (pos.latitude * 180 / Math.PI).toFixed(4);
                const lon = (pos.longitude * 180 / Math.PI).toFixed(4);
                const alt = Math.round(pos.height);
                params.set('lat', lat);
                params.set('lon', lon);
                params.set('alt', alt);
            }
        }
        const url = `${window.location.origin}?${params.toString()}`;
        navigator.clipboard.writeText(url).then(() => {
            alert('Share URL copied to clipboard!');
        });
    }, [currentTime, layers]);

    // Search handler
    const handleSearch = useCallback(async (query) => {
        setSearchQuery(query);
        if (!query || query.length < 2) { setSearchResults([]); return; }
        try {
            const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
            const data = await res.json();
            setSearchResults(data);
        } catch (err) {
            setSearchResults([]);
        }
    }, []);

    const flyToEntity = useCallback((result) => {
        if (!viewerRef.current || !result.longitude || !result.latitude) return;
        const Cesium = window.Cesium || require('cesium');
        viewerRef.current.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(result.longitude, result.latitude, 500000),
            duration: 2
        });
        setSearchResults([]);
        setSearchQuery('');
    }, []);

    // Handle ESC key for popups/search
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                setSearchQuery('');
                setSearchResults([]);
                if (viewerRef.current && viewerRef.current.selectedEntity) {
                    viewerRef.current.selectedEntity = undefined;
                }
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, []);

    return (
        <div className="app-container">
            <Header
                mouseCoords={mouseCoords}
                currentTime={currentTime}
                isLive={currentTime === null}
                onScreenshot={handleScreenshot}
                onShare={handleShare}
                searchQuery={searchQuery}
                onSearch={handleSearch}
                searchResults={searchResults}
                onSelectResult={flyToEntity}
            />
            <LayerPanel
                layers={layers}
                toggleLayer={toggleLayer}
                setBaseLayer={setBaseLayer}
                layerCounts={layerCounts}
                status={layerStates}
            />
            <main className="globe-container">
                <Globe
                    layers={layers}
                    currentTime={currentTime}
                    onMouseMove={setMouseCoords}
                    onViewerReady={(v) => { viewerRef.current = v; }}
                    onLayerCount={(id, count) => setLayerCounts(prev => ({ ...prev, [id]: count }))}
                    onLayerState={(id, state) => setLayerStates(prev => ({ ...prev, [id]: state }))}
                />
            </main>
            <Timeline
                currentTime={currentTime}
                setCurrentTime={setCurrentTime}
                isPlaying={isPlaying}
                setIsPlaying={setIsPlaying}
                playbackSpeed={playbackSpeed}
                setPlaybackSpeed={setPlaybackSpeed}
                goLive={goLive}
            />
        </div>
    );
}

export default App;
