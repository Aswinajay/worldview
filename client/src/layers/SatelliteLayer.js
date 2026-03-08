import React, { useEffect, useState, useRef } from 'react';
import * as Cesium from 'cesium';
import * as satellite from 'satellite.js';

// Store sampled properties for interpolation
const satCache = {};

const SatelliteLayer = ({ viewer, active, onCount, onLayerState }) => {
    const [tleData, setTleData] = useState([]);
    const dataSourceRef = useRef(null);
    const updateIntervalRef = useRef(null);

    useEffect(() => {
        if (!active) {
            if (onLayerState) onLayerState('satellites', null);
            return;
        }

        const fetchTLEs = async () => {
            if (onLayerState) onLayerState('satellites', 'loading');
            try {
                const res = await fetch('/api/satellites');
                const data = await res.json();
                setTleData(data);
                if (onLayerState) onLayerState('satellites', 'live');
            } catch (err) {
                console.error('Satellite fetch error:', err);
                if (onLayerState) onLayerState('satellites', 'error');
            }
        };
        fetchTLEs();
    }, [active]);

    useEffect(() => {
        if (!viewer) return;

        if (!active || tleData.length === 0) {
            if (dataSourceRef.current) {
                viewer.dataSources.remove(dataSourceRef.current);
                dataSourceRef.current = null;
            }
            if (updateIntervalRef.current) clearInterval(updateIntervalRef.current);
            // Clear cache
            Object.keys(satCache).forEach(k => delete satCache[k]);
            if (onCount) onCount(0);
            return;
        }

        const init = async () => {
            if (!dataSourceRef.current) {
                const ds = new Cesium.CustomDataSource('satellites');
                dataSourceRef.current = ds;
                await viewer.dataSources.add(ds);
            }
            const ds = dataSourceRef.current;

            // Build sat records
            const satRecords = [];
            tleData.forEach(sat => {
                try {
                    if (sat.TLE_LINE1 && sat.TLE_LINE2) {
                        const satrec = satellite.twoline2satrec(sat.TLE_LINE1, sat.TLE_LINE2);
                        if (satrec && satrec.error === 0) {
                            satRecords.push({
                                satrec,
                                name: sat.OBJECT_NAME || 'Unknown',
                                color: sat.color || '#ffffff',
                                group: sat.group || 'Active',
                                noradId: sat.NORAD_CAT_ID
                            });
                        }
                    }
                } catch (e) { }
            });

            const limited = satRecords.slice(0, 300);
            if (onCount) onCount(limited.length);

            const satSvg = `data:image/svg+xml;base64,${btoa(`
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
                    <filter id="glow"><feGaussianBlur stdDeviation="1.5" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                    <path d="M12 2L4.5 9h15L12 2zm0 20l7.5-7h-15l7.5 7zm-5-10.5h10V10H7v1.5z" fill="white" filter="url(#glow)"/>
                </svg>
            `)}`;

            const updatePositions = () => {
                const now = new Date();
                const julianNow = Cesium.JulianDate.fromDate(now);
                const gmst = satellite.gstime(now);

                limited.forEach((sat) => {
                    try {
                        const posVel = satellite.propagate(sat.satrec, now);
                        if (!posVel.position) return;
                        const geo = satellite.eciToGeodetic(posVel.position, gmst);
                        const pos = Cesium.Cartesian3.fromDegrees(
                            satellite.degreesLong(geo.longitude),
                            satellite.degreesLat(geo.latitude),
                            geo.height * 1000
                        );

                        const id = `sat-${sat.noradId}`;
                        if (!satCache[id]) {
                            satCache[id] = new Cesium.SampledPositionProperty();
                            satCache[id].forwardExtrapolationType = Cesium.ExtrapolationType.EXTRAPOLATE;
                        }
                        satCache[id].addSample(julianNow, pos);

                        let entity = ds.entities.getById(id);
                        if (!entity) {
                            const cesiumColor = Cesium.Color.fromCssColorString(sat.color);
                            entity = ds.entities.add({
                                id, name: sat.name,
                                position: satCache[id],
                                billboard: {
                                    image: satSvg, width: 14, height: 14, color: cesiumColor,
                                    distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 80000000)
                                },
                                label: {
                                    text: sat.name, font: 'bold 9px monospace', fillColor: cesiumColor,
                                    outlineColor: Cesium.Color.BLACK, outlineWidth: 2,
                                    style: Cesium.LabelStyle.FILL_AND_OUTLINE, pixelOffset: new Cesium.Cartesian2(10, 0),
                                    distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 8000000)
                                },
                                description: `
                                    <div class="tactical-info">
                                        <div style="font-weight:700; color:${cesiumColor.toCssColorString()}; margin-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.1)">
                                            ${sat.name}
                                        </div>
                                        <table class="cesium-infoBox-defaultTable"><tbody>
                                            <tr><th>NORAD</th><td>${sat.noradId}</td></tr>
                                            <tr><th>Category</th><td>${sat.group}</td></tr>
                                            <tr><th>Alt</th><td>${Math.round(geo.height)} KM</td></tr>
                                            <tr><th>Status</th><td>ORBITAL NOMINAL</td></tr>
                                        </tbody></table>
                                    </div>`
                            });
                        }
                    } catch (e) { }
                });
            };

            updatePositions();
            updateIntervalRef.current = setInterval(updatePositions, 1000);
        };

        init();
        return () => { if (updateIntervalRef.current) clearInterval(updateIntervalRef.current); };
    }, [viewer, tleData, active]);

    return null;
};

export default SatelliteLayer;
