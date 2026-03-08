import React, { useEffect, useRef, useState } from 'react';
import * as Cesium from 'cesium';

const EarthquakeLayer = ({ viewer, active, onCount, onLayerState }) => {
    const [quakes, setQuakes] = useState([]);
    const dataSourceRef = useRef(null);

    useEffect(() => {
        if (!active) {
            if (onLayerState) onLayerState('earthquakes', null);
            return;
        }

        const fetchQuakes = async () => {
            if (onLayerState) onLayerState('earthquakes', 'loading');
            try {
                const res = await fetch('/api/earthquakes');
                const data = await res.json();
                setQuakes(data);
                if (onCount) onCount(data.length);
                if (onLayerState) onLayerState('earthquakes', 'live');
            } catch (err) {
                console.error('Earthquakes fetch error:', err);
                if (onLayerState) onLayerState('earthquakes', 'error');
            }
        };
        fetchQuakes();
        const interval = setInterval(fetchQuakes, 600000); // 10 mins
        return () => clearInterval(interval);
    }, [active]);

    useEffect(() => {
        if (!viewer) return;

        if (!active) {
            if (dataSourceRef.current) {
                viewer.dataSources.remove(dataSourceRef.current);
                dataSourceRef.current = null;
            }
            if (onCount) onCount(0);
            return;
        }

        const render = async () => {
            if (!dataSourceRef.current) {
                dataSourceRef.current = new Cesium.CustomDataSource('earthquakes');
                await viewer.dataSources.add(dataSourceRef.current);
            }
            const ds = dataSourceRef.current;
            ds.entities.removeAll();

            quakes.forEach(quake => {
                if (!quake.longitude || !quake.latitude) return;

                // Color by magnitude
                let color = Cesium.Color.ORANGE;
                let pixelSize = 8;
                if (quake.magnitude >= 6.0) { color = Cesium.Color.RED; pixelSize = 16; }
                else if (quake.magnitude >= 4.5) { color = Cesium.Color.DARKORANGE; pixelSize = 12; }
                else if (quake.magnitude < 3.0) { color = Cesium.Color.YELLOW; pixelSize = 6; }

                ds.entities.add({
                    id: quake.id,
                    position: Cesium.Cartesian3.fromDegrees(quake.longitude, quake.latitude, 0), // Ignore depth for UI
                    name: quake.title,
                    description: `
                        <div class="tactical-info">
                            <div style="font-weight:700; color:${color.toCssColorString()}; margin-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.1)">
                                SEISMIC EVENT: ${quake.magnitude} MAG
                            </div>
                            <table class="cesium-infoBox-defaultTable"><tbody>
                                <tr><th>Magnitude</th><td>${quake.magnitude}</td></tr>
                                <tr><th>Location</th><td>${quake.place || 'Unknown'}</td></tr>
                                <tr><th>Depth</th><td>${quake.depth} KM</td></tr>
                                <tr><th>Time</th><td>${new Date(quake.time).toISOString().replace('T', ' ').substring(0, 19)}Z</td></tr>
                                <tr><th>Source</th><td>USGS GEOLOGICAL</td></tr>
                            </tbody></table>
                            <div style="margin-top:10px; text-align:right">
                                <a href="${quake.url}" target="_blank" style="color:var(--color-accent); text-decoration:none; font-size:10px">MISSION DATA →</a>
                            </div>
                        </div>`,
                    point: {
                        pixelSize,
                        color: color.withAlpha(0.8),
                        outlineColor: Cesium.Color.BLACK,
                        outlineWidth: 1,
                        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 15000000)
                    }
                });
            });
        };

        render();
    }, [viewer, active, quakes]);

    return null;
};

export default EarthquakeLayer;
