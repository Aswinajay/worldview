import React, { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';

const MaritimeRouteLayer = ({ viewer, active, onLayerState }) => {
    const dataSourceRef = useRef(null);

    useEffect(() => {
        if (!viewer) return;

        if (!active) {
            if (dataSourceRef.current) {
                viewer.dataSources.remove(dataSourceRef.current);
                dataSourceRef.current = null;
            }
            if (onLayerState) onLayerState('maritimeLanes', null);
            return;
        }

        const fetchLanes = async () => {
            if (onLayerState) onLayerState('maritimeLanes', 'loading');
            try {
                const res = await fetch('/api/maritime-infra/lanes');
                const data = await res.json();

                if (!dataSourceRef.current) {
                    dataSourceRef.current = new Cesium.CustomDataSource('maritime-lanes');
                    viewer.dataSources.add(dataSourceRef.current);
                }

                const ds = dataSourceRef.current;
                ds.entities.removeAll();

                data.forEach(lane => {
                    const start = Cesium.Cartesian3.fromDegrees(lane.origin_lon, lane.origin_lat, 0);
                    const end = Cesium.Cartesian3.fromDegrees(lane.dest_lon, lane.dest_lat, 0);

                    ds.entities.add({
                        name: `${lane.origin_city} ↔ ${lane.dest_city}`,
                        description: `
                            <table class="cesium-infoBox-defaultTable"><tbody>
                                <tr><th>Route</th><td>${lane.origin_city} to ${lane.dest_city}</td></tr>
                                <tr><th>Usage</th><td>Primary Shipping Lane</td></tr>
                            </tbody></table>`,
                        polyline: {
                            positions: [start, end],
                            width: 1.5,
                            arcType: Cesium.ArcType.RHUMB, // Maritime paths follow rhumb lines
                            material: new Cesium.PolylineGlowMaterialProperty({
                                glowPower: 0.1,
                                color: Cesium.Color.CYAN.withAlpha(0.2)
                            }),
                            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(2000000, 20000000)
                        }
                    });
                });

                if (onLayerState) onLayerState('maritimeLanes', 'live');
            } catch (err) {
                console.error('Error fetching maritime lanes:', err);
                if (onLayerState) onLayerState('maritimeLanes', 'error');
            }
        };

        fetchLanes();
    }, [viewer, active]);

    return null;
};

export default MaritimeRouteLayer;
