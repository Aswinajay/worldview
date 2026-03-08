import React, { useEffect, useState, useRef } from 'react';
import * as Cesium from 'cesium';

// Store accumulated trail positions across renders
const trailHistory = {};
const MAX_TRAIL_POINTS = 30;

// Store sampled properties for interpolation
const flightCache = {};

const FlightLayer = ({ viewer, active, currentTime, onCount, onLayerState, viewBbox }) => {
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
                const params = new URLSearchParams();
                if (currentTime) params.set('time', currentTime.toISOString());
                if (viewBbox) {
                    params.set('west', viewBbox.west);
                    params.set('south', viewBbox.south);
                    params.set('east', viewBbox.east);
                    params.set('north', viewBbox.north);
                }

                const url = `/api/flights?${params.toString()}`;
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
    }, [active, currentTime, viewBbox]);

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
            // Clear cache
            Object.keys(flightCache).forEach(k => delete flightCache[k]);
            if (onCount) onCount(0);
            return;
        }

        const renderData = async () => {
            if (!dataSourceRef.current) {
                const ds = new Cesium.CustomDataSource('flights');
                ds.clustering.enabled = true;
                ds.clustering.pixelRange = 40;
                ds.clustering.minimumClusterSize = 5;
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

            const now = currentTime ? Cesium.JulianDate.fromDate(currentTime) : viewer.clock.currentTime;

            flights.forEach(flight => {
                if (typeof flight.longitude !== 'number' || typeof flight.latitude !== 'number' ||
                    isNaN(flight.longitude) || isNaN(flight.latitude)) return;

                const icao = flight.icao24;
                const id = `flight-${icao}`;
                const trailId = `trail-${icao}`;
                updatedIds.add(id);
                updatedTrailIds.add(trailId);

                const altitude = (typeof flight.altitude === 'number' && !isNaN(flight.altitude)) ? flight.altitude : 10000;
                const position = Cesium.Cartesian3.fromDegrees(flight.longitude, flight.latitude, altitude);
                const velocity = (flight.velocity || 0); // m/s
                const headingDeg = (flight.heading || 0);
                const headingRad = Cesium.Math.toRadians(headingDeg);

                // --- Advanced Trajectory Prediction ---
                if (!flightCache[icao]) {
                    flightCache[icao] = {
                        sampledPosition: new Cesium.SampledPositionProperty(),
                    };
                    flightCache[icao].sampledPosition.forwardExtrapolationType = Cesium.ExtrapolationType.EXTRAPOLATE;
                    flightCache[icao].sampledPosition.forwardExtrapolationDuration = 60;
                }

                const cache = flightCache[icao];
                // Add the actual current sample
                cache.sampledPosition.addSample(now, position);

                // Add a "kick" sample 1 second in the future for smooth extrapolation if velocity is available
                if (velocity > 0) {
                    const futureSec = 1;
                    // Rough approximation for small distances
                    const latOffset = (velocity * Math.cos(headingRad) * futureSec) / 111111;
                    const lonOffset = (velocity * Math.sin(headingRad) * futureSec) / (111111 * Math.cos(Cesium.Math.toRadians(flight.latitude)));
                    const futurePos = Cesium.Cartesian3.fromDegrees(
                        flight.longitude + lonOffset,
                        flight.latitude + latOffset,
                        altitude
                    );
                    const futureTime = Cesium.JulianDate.addSeconds(now, futureSec, new Cesium.JulianDate());
                    cache.sampledPosition.addSample(futureTime, futurePos);
                }

                // Accumulate trail history
                if (!trailHistory[icao]) trailHistory[icao] = [];
                const lastEntry = trailHistory[icao][trailHistory[icao].length - 1];
                if (!lastEntry ||
                    Math.abs(lastEntry.lon - flight.longitude) > 0.0005 ||
                    Math.abs(lastEntry.lat - flight.latitude) > 0.0005) {

                    trailHistory[icao].push({
                        lon: flight.longitude, lat: flight.latitude, alt: altitude
                    });
                    if (trailHistory[icao].length > MAX_TRAIL_POINTS) trailHistory[icao].shift();
                }

                // Dynamic Colors for Radar Aesthetics
                let color = Cesium.Color.fromCssColorString('#00d2ff');
                if (altitude > 11000) color = Cesium.Color.fromCssColorString('#ff4081'); // High level (Pink)
                else if (altitude > 8000) color = Cesium.Color.fromCssColorString('#ffd740'); // Mid level (Gold)
                else if (altitude < 1000) color = Cesium.Color.fromCssColorString('#ffffff'); // Landing/Takeoff (White)

                const description = `
                    <div class="tactical-info">
                        <div style="font-weight:800; color:${color.toCssColorString()}; margin-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.2); letter-spacing:1px">
                            IDENT: ${flight.callsign || 'UNKNOWN'} [${icao.toUpperCase()}]
                        </div>
                        <table class="cesium-infoBox-defaultTable"><tbody>
                            <tr><th>FLIGHT LEVEL</th><td>FL${Math.round(altitude * 3.28084 / 100).toString().padStart(3, '0')} / ${Math.round(altitude).toLocaleString()}M</td></tr>
                            <tr><th>GRND VELOCITY</th><td>${Math.round(velocity * 1.94384)} KT</td></tr>
                            <tr><th>HEADING (T)</th><td>${Math.round(headingDeg).toString().padStart(3, '0')}°</td></tr>
                            <tr><th>THREAT PROFILE</th><td style="color:var(--color-success); font-weight:800">NOMINAL / CIVILIAN</td></tr>
                            <tr><th>INTEL SOURCE</th><td>SIGINT/ADSB-V2</td></tr>
                        </tbody></table>
                    </div>`;

                const planeSvg = `data:image/svg+xml;base64,${btoa(`
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
                        <filter id="glow"><feGaussianBlur stdDeviation="1.5" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                        <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" 
                              fill="white" filter="url(#glow)"/>
                    </svg>
                `)}`;

                const entity = ds.entities.getById(id);
                if (entity) {
                    entity.position = cache.sampledPosition;
                    entity.orientation = new Cesium.VelocityOrientationProperty(cache.sampledPosition);
                    entity.description = description;
                    entity.billboard.color = color;
                } else {
                    ds.entities.add({
                        id, name: flight.callsign || icao,
                        position: cache.sampledPosition,
                        orientation: new Cesium.VelocityOrientationProperty(cache.sampledPosition),
                        description,
                        billboard: {
                            image: planeSvg,
                            width: 28,
                            height: 28,
                            color: color,
                            alignedAxis: new Cesium.VelocityVectorProperty(cache.sampledPosition, true),
                            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 10000000)
                        },
                        label: {
                            text: flight.callsign || '',
                            font: 'bold 10px monospace',
                            fillColor: color,
                            outlineColor: Cesium.Color.BLACK,
                            outlineWidth: 2,
                            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                            pixelOffset: new Cesium.Cartesian2(0, 24),
                            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 1000000)
                        }
                    });
                }

                // Trail polyline
                const trail = trailHistory[icao];
                if (trail && trail.length >= 2) {
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
            toRemove.forEach(id => {
                ds.entities.removeById(id);
                delete flightCache[id.replace('flight-', '')];
            });

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
