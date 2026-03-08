import React, { useEffect, useState, useRef } from 'react';
import * as Cesium from 'cesium';

// Store sampled properties for interpolation
const vesselCache = {};
const shipTrailHistory = {};
const MAX_TRAIL_POINTS = 20;

const MaritimeLayer = ({ viewer, active, onCount, onLayerState, viewBbox }) => {
    const [ships, setShips] = useState([]);
    const dataSourceRef = useRef(null);
    const trailDataSourceRef = useRef(null);

    useEffect(() => {
        if (!active) {
            if (onLayerState) onLayerState('maritime', null);
            return;
        }

        const fetchShips = async () => {
            if (onLayerState) onLayerState('maritime', 'loading');
            try {
                const params = new URLSearchParams();
                if (viewBbox) {
                    params.set('west', viewBbox.west);
                    params.set('south', viewBbox.south);
                    params.set('east', viewBbox.east);
                    params.set('north', viewBbox.north);
                }

                const url = `/api/maritime?${params.toString()}`;
                const res = await fetch(url);
                const data = await res.json();
                setShips(data);
                if (onCount) onCount(data.length);
                if (onLayerState) onLayerState('maritime', 'live');
            } catch (err) {
                console.error('Maritime fetch error:', err);
                if (onLayerState) onLayerState('maritime', 'error');
            }
        };
        fetchShips();
        const interval = setInterval(fetchShips, 30000);
        return () => clearInterval(interval);
    }, [active, viewBbox]);

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
            Object.keys(vesselCache).forEach(k => delete vesselCache[k]);
            Object.keys(shipTrailHistory).forEach(k => delete shipTrailHistory[k]);
            return;
        }

        const render = async () => {
            if (!dataSourceRef.current) {
                const ds = new Cesium.CustomDataSource('maritime');
                ds.clustering.enabled = true;
                ds.clustering.pixelRange = 30;
                ds.clustering.minimumClusterSize = 3;
                ds.clustering.clusterEvent.addEventListener((clusteredEntities, cluster) => {
                    cluster.label.show = true;
                    cluster.label.text = clusteredEntities.length.toLocaleString();
                    cluster.label.font = 'bold 12px monospace';
                    cluster.label.fillColor = Cesium.Color.CYAN;
                    cluster.label.outlineColor = Cesium.Color.BLACK;
                    cluster.label.outlineWidth = 2;
                    cluster.label.style = Cesium.LabelStyle.FILL_AND_OUTLINE;
                    cluster.point.show = true;
                    cluster.point.pixelSize = 20;
                    cluster.point.color = Cesium.Color.CYAN.withAlpha(0.6);
                    cluster.point.outlineColor = Cesium.Color.WHITE;
                    cluster.point.outlineWidth = 1;
                });
                dataSourceRef.current = ds;
                await viewer.dataSources.add(ds);
            }

            if (!trailDataSourceRef.current) {
                trailDataSourceRef.current = new Cesium.CustomDataSource('maritime-trails');
                await viewer.dataSources.add(trailDataSourceRef.current);
            }

            const ds = dataSourceRef.current;
            const trailDs = trailDataSourceRef.current;
            const updatedIds = new Set();
            const updatedTrailIds = new Set();
            const now = viewer.clock.currentTime;

            ships.forEach(ship => {
                if (!ship.longitude || !ship.latitude) return;
                const mmsi = ship.mmsi;
                const id = `ship-${mmsi}`;
                updatedIds.add(id);

                let color = Cesium.Color.fromCssColorString('#00ffff');
                let shipData = { icon: 'M4 16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8H4v8z', label: 'Vessel' };

                if (ship.ship_type === 'Tanker') {
                    color = Cesium.Color.fromCssColorString('#ff9800');
                    shipData.icon = 'M18 15V8l-6-5-6 5v7c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2z';
                } else if (ship.ship_type === 'Cargo') {
                    color = Cesium.Color.fromCssColorString('#ffeb3b');
                    shipData.icon = 'M3 15h18v-2H3v2zm0 4h18v-2H3v2zm0-8h18V9H3v2zm0-4h18V5H3v2z';
                } else if (ship.ship_type === 'Passenger') {
                    color = Cesium.Color.fromCssColorString('#e91e63');
                    shipData.icon = 'M20 18c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h16z';
                }

                const position = Cesium.Cartesian3.fromDegrees(ship.longitude, ship.latitude, 0);
                const speedKnots = (ship.speed || 0);
                const speedMs = speedKnots * 0.514444;
                const headingDeg = (ship.heading || 0);
                const headingRad = Cesium.Math.toRadians(headingDeg);

                if (!vesselCache[mmsi]) {
                    vesselCache[mmsi] = {
                        sampledPosition: new Cesium.SampledPositionProperty(),
                    };
                    vesselCache[mmsi].sampledPosition.forwardExtrapolationType = Cesium.ExtrapolationType.EXTRAPOLATE;
                    vesselCache[mmsi].sampledPosition.forwardExtrapolationDuration = 120;
                }

                const cache = vesselCache[mmsi];
                cache.sampledPosition.addSample(now, position);

                // Prediction kick
                if (speedMs > 0.1) {
                    const futureSec = 5;
                    const latOffset = (speedMs * Math.cos(headingRad) * futureSec) / 111111;
                    const lonOffset = (speedMs * Math.sin(headingRad) * futureSec) / (111111 * Math.cos(Cesium.Math.toRadians(ship.latitude)));
                    const futurePos = Cesium.Cartesian3.fromDegrees(ship.longitude + lonOffset, ship.latitude + latOffset, 0);
                    const futureTime = Cesium.JulianDate.addSeconds(now, futureSec, new Cesium.JulianDate());
                    cache.sampledPosition.addSample(futureTime, futurePos);
                }

                const shipSvg = `data:image/svg+xml;base64,${btoa(`
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
                        <filter id="glow"><feGaussianBlur stdDeviation="1.5" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                        <path d="${shipData.icon}" fill="white" filter="url(#glow)"/>
                    </svg>
                `)}`;

                const threatLevel = ship.ship_type === 'Tanker' || ship.ship_type === 'Cargo' ? 'LOGISTICAL ASSET' : 'ELEVATED MONITORING';
                const threatColor = ship.ship_type === 'Tanker' || ship.ship_type === 'Cargo' ? 'var(--color-success)' : 'var(--color-warning)';

                const description = `
                    <div class="tactical-info">
                        <div style="font-weight:800; color:${color.toCssColorString()}; margin-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.2); letter-spacing:1px">
                            IDENT: ${String(ship.ship_name || 'UNKNOWN SIGNAL').toUpperCase()}
                        </div>
                        <table class="cesium-infoBox-defaultTable"><tbody>
                            <tr><th>HULL IDENT</th><td>${mmsi}</td></tr>
                            <tr><th>MISSION PROFILE</th><td>${ship.ship_type || 'UNDEFINED'}</td></tr>
                            <tr><th>SURFACE VELOCITY</th><td>${speedKnots.toFixed(1)} KT (SOG)</td></tr>
                            <tr><th>COURSE OVER GRND</th><td>${Math.round(headingDeg).toString().padStart(3, '0')}° (COG)</td></tr>
                            <tr><th>THREAT LEVEL</th><td style="color:${threatColor}; font-weight:800">${threatLevel}</td></tr>
                            <tr><th>INTEL SOURCE</th><td>ELINT/AIS-VHF</td></tr>
                        </tbody></table>
                    </div>`;

                // Accumulate trail history
                if (!shipTrailHistory[mmsi]) shipTrailHistory[mmsi] = [];
                const lastEntry = shipTrailHistory[mmsi][shipTrailHistory[mmsi].length - 1];
                if (!lastEntry ||
                    Math.abs(lastEntry.lon - ship.longitude) > 0.0001 ||
                    Math.abs(lastEntry.lat - ship.latitude) > 0.0001) {
                    shipTrailHistory[mmsi].push({ lon: ship.longitude, lat: ship.latitude });
                    if (shipTrailHistory[mmsi].length > MAX_TRAIL_POINTS) shipTrailHistory[mmsi].shift();
                }

                const entity = ds.entities.getById(id);
                if (entity) {
                    entity.position = cache.sampledPosition;
                    entity.orientation = new Cesium.VelocityOrientationProperty(cache.sampledPosition);
                    entity.description = description;
                    entity.billboard.color = color;
                } else {
                    ds.entities.add({
                        id,
                        name: ship.ship_name || ship.mmsi,
                        position: cache.sampledPosition,
                        orientation: new Cesium.VelocityOrientationProperty(cache.sampledPosition),
                        description,
                        billboard: {
                            image: shipSvg,
                            width: 22,
                            height: 22,
                            color: color,
                            alignedAxis: new Cesium.VelocityVectorProperty(cache.sampledPosition, true),
                            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 10000000)
                        },
                        label: {
                            text: ship.ship_name || '', font: 'bold 11px monospace',
                            fillColor: color,
                            outlineColor: Cesium.Color.BLACK, outlineWidth: 2,
                            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                            pixelOffset: new Cesium.Cartesian2(0, 20),
                            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 1000000)
                        }
                    });
                }

                // Render Trails
                const trailId = `trail-ship-${mmsi}`;
                updatedTrailIds.add(trailId);
                const trail = shipTrailHistory[mmsi];
                if (trail && trail.length >= 2) {
                    const trailPositions = trail.map(p => Cesium.Cartesian3.fromDegrees(p.lon, p.lat, 0));
                    const trailEntity = trailDs.entities.getById(trailId);
                    if (trailEntity) {
                        trailEntity.polyline.positions = trailPositions;
                    } else {
                        trailDs.entities.add({
                            id: trailId,
                            polyline: {
                                positions: trailPositions,
                                width: 2,
                                material: new Cesium.PolylineDashMaterialProperty({
                                    color: color.withAlpha(0.5),
                                    dashLength: 16
                                }),
                                distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 5000000)
                            }
                        });
                    }
                }
            });

            const toRemove = [];
            ds.entities.values.forEach(e => { if (!updatedIds.has(e.id)) toRemove.push(e.id); });
            toRemove.forEach(id => {
                ds.entities.removeById(id);
                delete vesselCache[id.replace('ship-', '')];
            });

            const trailsToRemove = [];
            trailDs.entities.values.forEach(e => { if (!updatedTrailIds.has(e.id)) trailsToRemove.push(e.id); });
            trailsToRemove.forEach(id => trailDs.entities.removeById(id));
        };
        render();
    }, [viewer, ships, active]);

    return null;
};

export default MaritimeLayer;
