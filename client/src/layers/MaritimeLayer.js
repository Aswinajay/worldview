import React, { useEffect, useState, useRef } from 'react';
import * as Cesium from 'cesium';

const MaritimeLayer = ({ viewer, active, onCount, onLayerState }) => {
    const [ships, setShips] = useState([]);
    const dataSourceRef = useRef(null);

    useEffect(() => {
        if (!active) {
            if (onLayerState) onLayerState('maritime', null);
            return;
        }

        const fetchShips = async () => {
            if (onLayerState) onLayerState('maritime', 'loading');
            try {
                const res = await fetch('/api/maritime');
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
    }, [active]);

    useEffect(() => {
        if (!viewer) return;
        if (!active) {
            if (dataSourceRef.current) {
                viewer.dataSources.remove(dataSourceRef.current);
                dataSourceRef.current = null;
            }
            return;
        }

        const render = async () => {
            if (!dataSourceRef.current) {
                const ds = new Cesium.CustomDataSource('maritime');

                // Enable clustering
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
            const ds = dataSourceRef.current;
            ds.entities.removeAll();

            ships.forEach(ship => {
                if (!ship.longitude || !ship.latitude) return;

                let color = Cesium.Color.CYAN;
                if (ship.ship_type === 'Tanker') color = Cesium.Color.ORANGE;
                else if (ship.ship_type === 'Cargo') color = Cesium.Color.YELLOW;
                else if (ship.ship_type === 'Passenger') color = Cesium.Color.MAGENTA;

                ds.entities.add({
                    id: `ship-${ship.mmsi}`,
                    name: ship.ship_name || ship.mmsi,
                    position: Cesium.Cartesian3.fromDegrees(ship.longitude, ship.latitude, 0),
                    description: `
                        <table class="cesium-infoBox-defaultTable"><tbody>
                            <tr><th>Name</th><td>${ship.ship_name}</td></tr>
                            <tr><th>Type</th><td>${ship.ship_type}</td></tr>
                            <tr><th>MMSI</th><td>${ship.mmsi}</td></tr>
                            <tr><th>Speed</th><td>${ship.speed ? ship.speed.toFixed(1) + ' kn' : 'N/A'}</td></tr>
                            <tr><th>Heading</th><td>${ship.heading ? Math.round(ship.heading) + '°' : 'N/A'}</td></tr>
                        </tbody></table>`,
                    point: {
                        pixelSize: 10, color,
                        outlineColor: Cesium.Color.WHITE, outlineWidth: 2,
                        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 15000000)
                    },
                    label: {
                        text: ship.ship_name || '', font: '11px monospace',
                        fillColor: color,
                        outlineColor: Cesium.Color.BLACK, outlineWidth: 2,
                        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                        pixelOffset: new Cesium.Cartesian2(14, 0),
                        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 5000000)
                    }
                });
            });
        };
        render();
    }, [viewer, ships, active]);

    return null;
};

export default MaritimeLayer;
