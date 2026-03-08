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
                    const isMilitary = apt.tactical_class !== 'CIVILIAN HUB';
                    const colorHex = isMilitary ? '#ffb300' : '#33ff00';
                    const cesiumColor = Cesium.Color.fromCssColorString(colorHex);

                    ds.entities.add({
                        id: `apt-${apt.icao}`,
                        name: apt.name,
                        position: Cesium.Cartesian3.fromDegrees(apt.longitude, apt.latitude, 0),
                        description: `
                            <div class="tactical-info">
                                <div style="font-weight:800; color:${colorHex}; margin-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.2); letter-spacing:1px">
                                    FACILITY: ${apt.name.toUpperCase()}
                                </div>
                                <table class="cesium-infoBox-defaultTable"><tbody>
                                    <tr><th>STRAT_CLASS</th><td style="color:${colorHex}; font-weight:800">${apt.tactical_class}</td></tr>
                                    <tr><th>REGION</th><td>${apt.city.toUpperCase()}, ${apt.country.toUpperCase()}</td></tr>
                                    <tr><th>ICAO IDENT</th><td>${apt.icao}</td></tr>
                                    <tr><th>ELEVATION</th><td>${Math.round(apt.altitude)} FT (MSL)</td></tr>
                                </tbody></table>
                            </div>`,
                        point: {
                            color: cesiumColor.withAlpha(0.8),
                            pixelSize: isMilitary ? 8 : 5,
                            outlineColor: Cesium.Color.fromCssColorString('#050705'),
                            outlineWidth: 1,
                            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 5000000)
                        },
                        label: {
                            text: apt.icao,
                            font: isMilitary ? 'bold 11px monospace' : '10px monospace',
                            fillColor: cesiumColor,
                            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                            outlineWidth: 2,
                            outlineColor: Cesium.Color.fromCssColorString('#050705'),
                            pixelOffset: new Cesium.Cartesian2(0, -14),
                            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, isMilitary ? 2000000 : 1000000)
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
