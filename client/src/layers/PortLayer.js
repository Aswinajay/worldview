import React, { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';

const PortLayer = ({ viewer, active, onLayerState, onCount }) => {
    const dataSourceRef = useRef(null);

    useEffect(() => {
        if (!viewer) return;

        if (!active) {
            if (dataSourceRef.current) {
                viewer.dataSources.remove(dataSourceRef.current);
                dataSourceRef.current = null;
            }
            if (onLayerState) onLayerState('ports', null);
            return;
        }

        const fetchPorts = async () => {
            if (onLayerState) onLayerState('ports', 'loading');
            try {
                const res = await fetch('/api/maritime-infra/ports');
                const data = await res.json();

                if (!dataSourceRef.current) {
                    dataSourceRef.current = new Cesium.CustomDataSource('maritime-hubs');
                    viewer.dataSources.add(dataSourceRef.current);
                }

                const ds = dataSourceRef.current;
                ds.entities.removeAll();

                data.forEach(port => {
                    ds.entities.add({
                        id: `port-${port.code}`,
                        name: port.name,
                        position: Cesium.Cartesian3.fromDegrees(port.longitude, port.latitude, 0),
                        description: `
                            <div class="tactical-info">
                                <div style="font-weight:700; color:#00d2ff; margin-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.1)">
                                    MARITIME HUB: ${port.name.toUpperCase()}
                                </div>
                                <table class="cesium-infoBox-defaultTable"><tbody>
                                    <tr><th>City</th><td>${port.city}</td></tr>
                                    <tr><th>Country</th><td>${port.country}</td></tr>
                                    <tr><th>LOCODE</th><td>${port.code}</td></tr>
                                    <tr><th>Status</th><td>NOMINAL PORT OPS</td></tr>
                                </tbody></table>
                            </div>`,
                        point: {
                            color: Cesium.Color.fromCssColorString('#00d2ff'),
                            pixelSize: 8,
                            outlineColor: Cesium.Color.WHITE,
                            outlineWidth: 1,
                            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 8000000)
                        },
                        label: {
                            text: port.city.toUpperCase(),
                            font: 'bold 10px monospace',
                            fillColor: Cesium.Color.WHITE,
                            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                            outlineWidth: 2,
                            outlineColor: Cesium.Color.BLACK,
                            pixelOffset: new Cesium.Cartesian2(0, 15),
                            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 2000000)
                        }
                    });
                });

                if (onCount) onCount(data.length);
                if (onLayerState) onLayerState('ports', 'live');
            } catch (err) {
                console.error('Error fetching ports:', err);
                if (onLayerState) onLayerState('ports', 'error');
            }
        };

        fetchPorts();
    }, [viewer, active]);

    return null;
};

export default PortLayer;
