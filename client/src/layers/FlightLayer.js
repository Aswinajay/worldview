import React, { useEffect, useState, useRef } from 'react';
import * as Cesium from 'cesium';

// Store accumulated trail positions across renders
const trailHistory = {};
const MAX_TRAIL_POINTS = 30;

const FlightLayer = ({ viewer, active, currentTime, onCount, onLayerState }) => {
    const [flights, setFlights] = useState([]);
    const dataSourceRef = useRef(null);
    const trailDataSourceRef = useRef(null);

    useEffect(() => {
        if (!active) {
            if (onLayerState) onLayerState('flights', null);
            return;
        }

        const fetchFlights = async () => {
            if (onLayerState) onLayerState('flights', 'loading');
            try {
                const url = currentTime
                    ? `/api/flights?time=${currentTime.toISOString()}`
                    : '/api/flights';
                const res = await fetch(url);
                const data = await res.json();
                setFlights(data);
                if (onCount) onCount(data.length);
                if (onLayerState) onLayerState('flights', 'live');
            } catch (err) {
                console.error('Failed to fetch flights:', err);
                if (onLayerState) onLayerState('flights', 'error');
            }
        };

        fetchFlights();
        const interval = currentTime ? null : setInterval(fetchFlights, 10000);
        return () => { if (interval) clearInterval(interval); };
    }, [active, currentTime]);

    useEffect(() => {
        if (!viewer) return;

        if (!active) {
            if (dataSourceRef.current) {
                viewer.dataSources.remove(dataSourceRef.current);
                dataSourceRef.current = null;
            }
            if (trailDataSourceRef.current) {
                viewer.dataSources.remove(trailDataSourceRef.current);
                trailDataSourceRef.current = null;
            }
            if (onCount) onCount(0);
            return;
        }

        const renderData = async () => {
            if (!dataSourceRef.current) {
                const ds = new Cesium.CustomDataSource('flights');

                // Enable clustering for performance
                ds.clustering.enabled = true;
                ds.clustering.pixelRange = 40;
                ds.clustering.minimumClusterSize = 5;

                // Custom cluster style
                ds.clustering.clusterEvent.addEventListener((clusteredEntities, cluster) => {
                    cluster.label.show = true;
                    cluster.label.text = clusteredEntities.length.toLocaleString();
                    cluster.label.font = 'bold 12px sans-serif';
                    cluster.label.fillColor = Cesium.Color.fromCssColorString('#00d2ff');
                    cluster.label.outlineColor = Cesium.Color.BLACK;
                    cluster.label.outlineWidth = 3;
                    cluster.label.style = Cesium.LabelStyle.FILL_AND_OUTLINE;
                    cluster.label.verticalOrigin = Cesium.VerticalOrigin.CENTER;

                    cluster.point.show = true;
                    cluster.point.pixelSize = 24;
                    cluster.point.color = Cesium.Color.fromCssColorString('#00d2ff').withAlpha(0.6);
                    cluster.point.outlineColor = Cesium.Color.WHITE;
                    cluster.point.outlineWidth = 2;
                });

                dataSourceRef.current = ds;
                await viewer.dataSources.add(ds);
            }
            if (!trailDataSourceRef.current) {
                trailDataSourceRef.current = new Cesium.CustomDataSource('flight-trails');
                await viewer.dataSources.add(trailDataSourceRef.current);
            }

            const ds = dataSourceRef.current;
            const trailDs = trailDataSourceRef.current;
            const updatedIds = new Set();
            const updatedTrailIds = new Set();

            flights.forEach(flight => {
                if (typeof flight.longitude !== 'number' || typeof flight.latitude !== 'number' ||
                    isNaN(flight.longitude) || isNaN(flight.latitude)) return;

                const icao = flight.icao24;
                const id = `flight-${icao}`;
                const trailId = `trail-${icao}`;
                updatedIds.add(id);
                updatedTrailIds.add(trailId);

                const altitude = (typeof flight.altitude === 'number' && !isNaN(flight.altitude)) ? flight.altitude : 10000;

                // Accumulate trail history
                if (!trailHistory[icao]) trailHistory[icao] = [];
                const lastEntry = trailHistory[icao][trailHistory[icao].length - 1];
                if (!lastEntry ||
                    Math.abs(lastEntry.lon - flight.longitude) > 0.001 ||
                    Math.abs(lastEntry.lat - flight.latitude) > 0.001) {

                    trailHistory[icao].push({
                        lon: flight.longitude,
                        lat: flight.latitude,
                        alt: altitude,
                        time: Date.now()
                    });

                    if (trailHistory[icao].length > MAX_TRAIL_POINTS) {
                        trailHistory[icao] = trailHistory[icao].slice(-MAX_TRAIL_POINTS);
                    }
                }

                const position = Cesium.Cartesian3.fromDegrees(
                    flight.longitude, flight.latitude, altitude
                );

                const heading = Cesium.Math.toRadians(flight.heading || 0);
                const hpr = new Cesium.HeadingPitchRoll(heading, 0, 0);
                const orientation = Cesium.Transforms.headingPitchRollQuaternion(position, hpr);

                let color = Cesium.Color.DODGERBLUE;
                if (altitude > 10000) color = Cesium.Color.CRIMSON;
                else if (altitude > 7000) color = Cesium.Color.GOLD;
                else if (altitude > 3000) color = Cesium.Color.LIMEGREEN;

                const description = `
                    <table class="cesium-infoBox-defaultTable"><tbody>
                        <tr><th>Callsign</th><td>${flight.callsign || 'Unknown'}</td></tr>
                        <tr><th>ICAO24</th><td>${icao}</td></tr>
                        <tr><th>Country</th><td>${flight.origin_country || 'Unknown'}</td></tr>
                        <tr><th>Altitude</th><td>${altitude ? Math.round(altitude) + ' m (' + Math.round(altitude * 3.28084) + ' ft)' : 'N/A'}</td></tr>
                        <tr><th>Velocity</th><td>${flight.velocity ? Math.round(flight.velocity * 3.6) + ' km/h (' + Math.round(flight.velocity * 1.94384) + ' kn)' : 'N/A'}</td></tr>
                        <tr><th>Heading</th><td>${flight.heading ? Math.round(flight.heading) + '°' : 'N/A'}</td></tr>
                        <tr><th>Vertical Rate</th><td>${flight.vertical_rate ? (flight.vertical_rate > 0 ? '↑' : '↓') + ' ' + Math.abs(Math.round(flight.vertical_rate)) + ' m/s' : 'Level'}</td></tr>
                        <tr><th>On Ground</th><td>${flight.on_ground ? 'Yes' : 'No'}</td></tr>
                    </tbody></table>`;

                const planeSvg = `data:image/svg+xml;base64,${btoa(`
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="white">
                        <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
                    </svg>
                `)}`;

                const entity = ds.entities.getById(id);
                if (entity) {
                    entity.position = position;
                    entity.orientation = orientation;
                    entity.description = description;
                    entity.billboard.color = color;
                    entity.billboard.rotation = heading;
                } else {
                    ds.entities.add({
                        id, name: flight.callsign || icao,
                        position, orientation, description,
                        billboard: {
                            image: planeSvg,
                            width: 24,
                            height: 24,
                            color: color,
                            rotation: heading,
                            alignedAxis: Cesium.Cartesian3.UNIT_Z,
                            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 8000000)
                        },
                        label: {
                            text: flight.callsign || '',
                            font: '10px monospace',
                            fillColor: Cesium.Color.WHITE,
                            outlineColor: Cesium.Color.BLACK,
                            outlineWidth: 2,
                            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                            pixelOffset: new Cesium.Cartesian2(0, 20),
                            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 1500000)
                        }
                    });
                }

                // Trail polyline
                const trail = trailHistory[icao];
                if (trail && trail.length >= 2) {
                    // Pre-filter trail to guarantee no NaN values get sent to Cesium Array buffers
                    const validTrail = trail.filter(p => !isNaN(p.lon) && !isNaN(p.lat) && !isNaN(p.alt));

                    if (validTrail.length >= 2) {
                        const trailPositions = validTrail.map(p =>
                            Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.alt)
                        );
                        const trailEntity = trailDs.entities.getById(trailId);
                        if (trailEntity) {
                            trailEntity.polyline.positions = trailPositions;
                        } else {
                            trailDs.entities.add({
                                id: trailId,
                                polyline: {
                                    positions: trailPositions,
                                    width: 3,
                                    material: new Cesium.PolylineGlowMaterialProperty({
                                        glowPower: 0.25,
                                        color: color.withAlpha(0.8)
                                    }),
                                    distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 8000000)
                                }
                            });
                        }
                    }
                }
            });

            const toRemove = [];
            ds.entities.values.forEach(e => { if (!updatedIds.has(e.id)) toRemove.push(e.id); });
            toRemove.forEach(id => ds.entities.removeById(id));

            const trailsToRemove = [];
            trailDs.entities.values.forEach(e => { if (!updatedTrailIds.has(e.id)) trailsToRemove.push(e.id); });
            trailsToRemove.forEach(id => {
                trailDs.entities.removeById(id);
                const icao = id.replace('trail-', '');
                delete trailHistory[icao];
            });
        };

        renderData();
    }, [viewer, flights, active]);

    return null;
};

export default FlightLayer;
