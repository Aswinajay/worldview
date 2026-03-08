import React, { useEffect, useRef, useState } from 'react';
import * as Cesium from 'cesium';

const EarthquakeLayer = ({ viewer, active, onCount }) => {
    const [quakes, setQuakes] = useState([]);
    const dataSourceRef = useRef(null);

    useEffect(() => {
        if (!active) return;
        const fetchQuakes = async () => {
            try {
                const res = await fetch('/api/earthquakes');
                const data = await res.json();
                setQuakes(data);
                if (onCount) onCount(data.length);
            } catch (err) { console.error('Earthquakes fetch error:', err); }
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
                        <table class="cesium-infoBox-defaultTable"><tbody>
                            <tr><th>Magnitude</th><td>${quake.magnitude}</td></tr>
                            <tr><th>Time</th><td>${new Date(quake.time).toUTCString()}</td></tr>
                            <tr><th>Depth</th><td>${quake.depth} km</td></tr>
                            <tr><th>Link</th><td><a href="${quake.url}" target="_blank">USGS Details</a></td></tr>
                        </tbody></table>`,
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
