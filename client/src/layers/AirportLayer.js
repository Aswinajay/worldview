import React, { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';

const AirportLayer = ({ viewer, active, onLayerState, onCount }) => {
    const dataSourceRef = useRef(null);

    useEffect(() => {
        if (!viewer) return;

        if (!active) {
            if (dataSourceRef.current) {
                viewer.dataSources.remove(dataSourceRef.current);
                dataSourceRef.current = null;
            }
            if (onLayerState) onLayerState('airports', null);
            return;
        }

        const fetchAirports = async () => {
            if (onLayerState) onLayerState('airports', 'loading');
            try {
                // Fetch just major airports for performance
                const res = await fetch('/api/routes/airports?q=');
                const data = await res.json();

                if (!dataSourceRef.current) {
                    dataSourceRef.current = new Cesium.CustomDataSource('airports');
                    viewer.dataSources.add(dataSourceRef.current);
                }

                const ds = dataSourceRef.current;
                ds.entities.removeAll();

                data.forEach(apt => {
                    ds.entities.add({
                        id: `apt-${apt.icao}`,
                        name: apt.name,
                        position: Cesium.Cartesian3.fromDegrees(apt.longitude, apt.latitude, 0),
                        description: `
                            <table class="cesium-infoBox-defaultTable"><tbody>
                                <tr><th>City</th><td>${apt.city}</td></tr>
                                <tr><th>Country</th><td>${apt.country}</td></tr>
                                <tr><th>IATA/ICAO</th><td>${apt.iata || '-'}/${apt.icao}</td></tr>
                                <tr><th>Altitude</th><td>${Math.round(apt.altitude)} ft</td></tr>
                            </tbody></table>`,
                        point: {
                            color: Cesium.Color.fromCssColorString('#00d2ff'),
                            pixelSize: 6,
                            outlineColor: Cesium.Color.WHITE,
                            outlineWidth: 1,
                            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 5000000)
                        },
                        label: {
                            text: apt.icao,
                            font: '10px monospace',
                            fillColor: Cesium.Color.WHITE,
                            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                            outlineWidth: 2,
                            outlineColor: Cesium.Color.BLACK,
                            pixelOffset: new Cesium.Cartesian2(0, -12),
                            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 1000000)
                        }
                    });
                });

                if (onCount) onCount(data.length);
                if (onLayerState) onLayerState('airports', 'live');
            } catch (err) {
                console.error('Error fetching airports:', err);
                if (onLayerState) onLayerState('airports', 'error');
            }
        };

        fetchAirports();
    }, [viewer, active]);

    return null;
};

export default AirportLayer;
