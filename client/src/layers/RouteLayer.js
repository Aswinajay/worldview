import React, { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';

const RouteLayer = ({ viewer, active, onLayerState }) => {
    const dataSourceRef = useRef(null);

    useEffect(() => {
        if (!viewer) return;

        if (!active) {
            if (dataSourceRef.current) {
                viewer.dataSources.remove(dataSourceRef.current);
                dataSourceRef.current = null;
            }
            if (onLayerState) onLayerState('routes', null);
            return;
        }

        const fetchRoutes = async () => {
            if (onLayerState) onLayerState('routes', 'loading');
            try {
                const res = await fetch('/api/routes');
                const data = await res.json();

                if (!dataSourceRef.current) {
                    dataSourceRef.current = new Cesium.CustomDataSource('aviation-routes');
                    viewer.dataSources.add(dataSourceRef.current);
                }

                const ds = dataSourceRef.current;
                ds.entities.removeAll();

                data.forEach(route => {
                    const start = Cesium.Cartesian3.fromDegrees(route.origin_lon, route.origin_lat, 0);
                    const end = Cesium.Cartesian3.fromDegrees(route.dest_lon, route.dest_lat, 0);

                    // Glowing arc
                    ds.entities.add({
                        name: `${route.origin_icao} → ${route.dest_icao}`,
                        description: `
                            <table class="cesium-infoBox-defaultTable"><tbody>
                                <tr><th>Route</th><td>${route.origin_city} to ${route.dest_city}</td></tr>
                                <tr><th>Origin</th><td>${route.origin_name} (${route.origin_icao})</td></tr>
                                <tr><th>Dest</th><td>${route.dest_name} (${route.dest_icao})</td></tr>
                            </tbody></table>`,
                        polyline: {
                            positions: [start, end],
                            width: 2,
                            arcType: Cesium.ArcType.GEODESIC,
                            material: new Cesium.PolylineGlowMaterialProperty({
                                glowPower: 0.1,
                                color: Cesium.Color.YELLOW.withAlpha(0.3)
                            }),
                            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(2000000, 20000000)
                        }
                    });
                });

                if (onLayerState) onLayerState('routes', 'live');
            } catch (err) {
                console.error('Error fetching routes:', err);
                if (onLayerState) onLayerState('routes', 'error');
            }
        };

        fetchRoutes();
    }, [viewer, active]);

    return null;
};

export default RouteLayer;
