import React, { useEffect, useState, useRef } from 'react';
import * as Cesium from 'cesium';
import * as satellite from 'satellite.js';

const SatelliteLayer = ({ viewer, active }) => {
    const [tleData, setTleData] = useState([]);
    const dataSourceRef = useRef(null);
    const animFrameRef = useRef(null);

    useEffect(() => {
        if (!active) return;
        const fetchTLEs = async () => {
            try {
                const res = await fetch('/api/satellites');
                setTleData(await res.json());
            } catch (err) { console.error('Satellite fetch error:', err); }
        };
        fetchTLEs();
    }, [active]);

    useEffect(() => {
        if (!viewer || !active || tleData.length === 0) {
            if (dataSourceRef.current) {
                viewer?.dataSources?.remove(dataSourceRef.current);
                dataSourceRef.current = null;
            }
            cancelAnimationFrame(animFrameRef.current);
            return;
        }

        const init = async () => {
            if (!dataSourceRef.current) {
                dataSourceRef.current = new Cesium.CustomDataSource('satellites');
                await viewer.dataSources.add(dataSourceRef.current);
            }
            const ds = dataSourceRef.current;
            ds.entities.removeAll();

            // Build satellite records from OMM/GP JSON data
            const satRecords = [];
            tleData.forEach(sat => {
                try {
                    // CelesTrak GP JSON format includes TLE lines
                    if (sat.TLE_LINE1 && sat.TLE_LINE2) {
                        const satrec = satellite.twoline2satrec(sat.TLE_LINE1, sat.TLE_LINE2);
                        satRecords.push({
                            satrec,
                            name: sat.OBJECT_NAME || 'Unknown',
                            group: sat.group || 'Active',
                            color: sat.color || '#00d2ff',
                            noradId: sat.NORAD_CAT_ID
                        });
                    }
                } catch (e) { /* skip invalid TLEs */ }
            });

            // Limit rendering to first 150 for performance
            const limited = satRecords.slice(0, 150);

            // Create entities
            limited.forEach((sat, i) => {
                const cesiumColor = Cesium.Color.fromCssColorString(sat.color).withAlpha(0.9);
                ds.entities.add({
                    id: `sat-${sat.noradId || i}`,
                    name: sat.name,
                    position: Cesium.Cartesian3.fromDegrees(0, 0, 400000),
                    description: `
                        <table class="cesium-infoBox-defaultTable"><tbody>
                            <tr><th>Name</th><td>${sat.name}</td></tr>
                            <tr><th>NORAD ID</th><td>${sat.noradId || 'N/A'}</td></tr>
                            <tr><th>Group</th><td>${sat.group}</td></tr>
                        </tbody></table>`,
                    point: {
                        pixelSize: 4, color: cesiumColor,
                        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 20000000)
                    },
                    label: {
                        text: sat.name, font: '9px monospace',
                        fillColor: cesiumColor,
                        outlineColor: Cesium.Color.BLACK, outlineWidth: 1,
                        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                        pixelOffset: new Cesium.Cartesian2(8, 0),
                        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 3000000)
                    }
                });
            });

            // Animation loop: propagate orbital positions each frame
            const propagate = () => {
                const now = new Date();
                const gmst = satellite.gstime(now);

                limited.forEach((sat, i) => {
                    try {
                        const posVel = satellite.propagate(sat.satrec, now);
                        if (!posVel.position) return;
                        const geo = satellite.eciToGeodetic(posVel.position, gmst);
                        const lon = satellite.degreesLong(geo.longitude);
                        const lat = satellite.degreesLat(geo.latitude);
                        const alt = geo.height * 1000; // km to meters

                        const entity = ds.entities.getById(`sat-${sat.noradId || i}`);
                        if (entity) {
                            entity.position = Cesium.Cartesian3.fromDegrees(lon, lat, alt);
                        }
                    } catch (e) { /* skip propagation errors */ }
                });

                animFrameRef.current = requestAnimationFrame(propagate);
            };
            propagate();
        };

        init();
        return () => cancelAnimationFrame(animFrameRef.current);
    }, [viewer, tleData, active]);

    return null;
};

export default SatelliteLayer;
