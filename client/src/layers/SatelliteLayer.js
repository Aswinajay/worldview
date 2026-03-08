import React, { useEffect, useState, useRef } from 'react';
import * as Cesium from 'cesium';
import * as satellite from 'satellite.js';

const SatelliteLayer = ({ viewer, active, onCount, onLayerState }) => {
    const [tleData, setTleData] = useState([]);
    const dataSourceRef = useRef(null);
    const animFrameRef = useRef(null);

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
                console.log(`[SatelliteLayer] Received ${data.length} TLE records`);
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
            cancelAnimationFrame(animFrameRef.current);
            if (onCount) onCount(0);
            return;
        }

        const init = async () => {
            if (!dataSourceRef.current) {
                dataSourceRef.current = new Cesium.CustomDataSource('satellites');
                await viewer.dataSources.add(dataSourceRef.current);
            }
            const ds = dataSourceRef.current;
            ds.entities.removeAll();

            // Build sat records — try TLE_LINE1/2 first, then fall back to OMM fields
            const satRecords = [];
            tleData.forEach(sat => {
                try {
                    let satrec = null;

                    if (sat.TLE_LINE1 && sat.TLE_LINE2) {
                        satrec = satellite.twoline2satrec(sat.TLE_LINE1, sat.TLE_LINE2);
                    } else if (sat.MEAN_MOTION !== undefined && sat.ECCENTRICITY !== undefined) {
                        // OMM format parsing (often returned by CelesTrak JSON GP)
                        // satellite.js Twoline2Satrec expects TLE lines, but we can synthesize or use jsonToSatrec if available
                        // Since many APIs provide this, we convert it or skip.
                        // For now we rely on the backend providing TLE_LINE1/2 but fix the check
                        return;
                    }

                    if (satrec && satrec.error === 0) {
                        // Color by group
                        let color = '#00d2ff';
                        const name = (sat.OBJECT_NAME || 'Unknown').toUpperCase();
                        if (sat.group === 'GPS' || name.includes('NAVSTAR')) color = '#ffffff';
                        else if (name.includes('STARLINK')) color = '#00e676';
                        else if (name.includes('ISS')) color = '#ff4081';
                        else if (name.includes('MAXAR') || name.includes('WORLDVIEW') || name.includes('GEOEYE')) color = '#ffd740';
                        else if (name.includes('CAPELLA')) color = '#e040fb';
                        else color = sat.color || '#00d2ff';

                        satRecords.push({
                            satrec,
                            name: sat.OBJECT_NAME || 'Unknown',
                            group: sat.group || 'Active',
                            color,
                            noradId: sat.NORAD_CAT_ID
                        });
                    }
                } catch (e) { /* skip invalid */ }
            });

            console.log(`[SatelliteLayer] Successfully parsed ${satRecords.length} satellites`);
            if (onCount) onCount(satRecords.length);

            // Render up to 200 for performance
            const limited = satRecords.slice(0, 200);

            // Create entities with initial positions
            const now = new Date();
            const gmst = satellite.gstime(now);

            limited.forEach((sat, i) => {
                let lon = 0, lat = 0, alt = 400000;
                try {
                    const posVel = satellite.propagate(sat.satrec, now);
                    if (posVel.position) {
                        const geo = satellite.eciToGeodetic(posVel.position, gmst);
                        lon = satellite.degreesLong(geo.longitude);
                        lat = satellite.degreesLat(geo.latitude);
                        alt = geo.height * 1000;
                    }
                } catch (e) { }

                const cesiumColor = Cesium.Color.fromCssColorString(sat.color).withAlpha(0.9);
                ds.entities.add({
                    id: `sat-${sat.noradId || i}`,
                    name: sat.name,
                    position: Cesium.Cartesian3.fromDegrees(lon, lat, alt),
                    description: `
                        <table class="cesium-infoBox-defaultTable"><tbody>
                            <tr><th>Name</th><td>${sat.name}</td></tr>
                            <tr><th>NORAD ID</th><td>${sat.noradId || 'N/A'}</td></tr>
                            <tr><th>Group</th><td>${sat.group}</td></tr>
                            <tr><th>Altitude</th><td>${Math.round(alt / 1000)} km</td></tr>
                        </tbody></table>`,
                    point: {
                        pixelSize: 5, color: cesiumColor,
                        outlineColor: cesiumColor.withAlpha(0.4), outlineWidth: 2,
                        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 50000000)
                    },
                    label: {
                        text: sat.name, font: '9px monospace',
                        fillColor: cesiumColor,
                        outlineColor: Cesium.Color.BLACK, outlineWidth: 1,
                        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                        pixelOffset: new Cesium.Cartesian2(8, 0),
                        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 5000000)
                    }
                });
            });

            // Animation loop — update positions every 500ms instead of every frame for perf
            let lastUpdate = 0;
            const propagate = (timestamp) => {
                if (timestamp - lastUpdate < 500) {
                    animFrameRef.current = requestAnimationFrame(propagate);
                    return;
                }
                lastUpdate = timestamp;

                const now = new Date();
                const gmst = satellite.gstime(now);

                limited.forEach((sat, i) => {
                    try {
                        const posVel = satellite.propagate(sat.satrec, now);
                        if (!posVel.position) return;
                        const geo = satellite.eciToGeodetic(posVel.position, gmst);
                        const lon = satellite.degreesLong(geo.longitude);
                        const lat = satellite.degreesLat(geo.latitude);
                        const alt = geo.height * 1000;

                        const entity = ds.entities.getById(`sat-${sat.noradId || i}`);
                        if (entity) {
                            entity.position = Cesium.Cartesian3.fromDegrees(lon, lat, alt);
                        }
                    } catch (e) { }
                });

                animFrameRef.current = requestAnimationFrame(propagate);
            };
            animFrameRef.current = requestAnimationFrame(propagate);
        };

        init();
        return () => cancelAnimationFrame(animFrameRef.current);
    }, [viewer, tleData, active]);

    return null;
};

export default SatelliteLayer;
