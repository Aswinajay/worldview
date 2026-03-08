import React, { useState } from 'react';
import Globe from './components/Globe';
import LayerPanel from './components/LayerPanel';
import Timeline from './components/Timeline';
import Header from './components/Header';

function App() {
    const [layers, setLayers] = useState({
        baseLayer: 'satellite', // 'satellite', 'terrain', 'dark'
        flights: true,
        maritime: false,
        satellites: false,
        gpsJam: false,
        notams: false,
        internet: false,
        conflicts: false
    });

    const toggleLayer = (layerId) => {
        setLayers(prev => ({
            ...prev,
            [layerId]: !prev[layerId]
        }));
    };

    const setBaseLayer = (layerId) => {
        setLayers(prev => ({
            ...prev,
            baseLayer: layerId
        }));
    };

    return (
        <div className="app-container">
            <Header />
            <LayerPanel layers={layers} toggleLayer={toggleLayer} setBaseLayer={setBaseLayer} />
            <main className="globe-container">
                <Globe layers={layers} />
            </main>
            <Timeline />
        </div>
    );
}

export default App;
