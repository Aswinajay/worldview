import React, { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';

// Simulated NOTAM / Airspace Closure polygons
const NOTAM_ZONES = [
    {
        id: 'notam-ukraine', name: 'NOTAM: Ukraine Airspace Closure',
        severity: 'PROHIBITED', description: 'Full airspace closure due to conflict',
        coords: [22, 52, 40, 52, 40, 44, 22, 44] // [lon, lat, lon, lat, ...]
    },
    {
        id: 'notam-syria', name: 'NOTAM: Syrian Airspace Restriction',
        severity: 'RESTRICTED', description: 'Restricted below FL350',
        coords: [35.7, 37, 42.3, 37, 42.3, 32.3, 35.7, 32.3]
    },
    {
        id: 'notam-libya', name: 'NOTAM: Libyan FIR Warning',
        severity: 'WARNING', description: 'Risk of unmanned aerial activity',
        coords: [9, 33.2, 25, 33.2, 25, 19.5, 9, 19.5]
    },
    {
        id: 'notam-iran', name: 'NOTAM: Iran Airspace Advisory',
        severity: 'WARNING', description: 'GPS interference reported',
        coords: [44, 40, 63.3, 40, 63.3, 25, 44, 25]
    },
];

const NotamLayer = ({ viewer, active, onCount, onLayerState }) => {
    const dataSourceRef = useRef(null);

    useEffect(() => {
        if (!active) {
            if (onLayerState) onLayerState('notams', null);
            return;
        }
        if (onLayerState) onLayerState('notams', 'live');

        if (onCount) onCount(NOTAM_ZONES.length);
        const render = async () => {
            if (!dataSourceRef.current) {
                dataSourceRef.current = new Cesium.CustomDataSource('notams');
                await viewer.dataSources.add(dataSourceRef.current);
            }
            const ds = dataSourceRef.current;
            ds.entities.removeAll();

            NOTAM_ZONES.forEach(zone => {
                let color;
                switch (zone.severity) {
                    case 'PROHIBITED': color = Cesium.Color.RED.withAlpha(0.25); break;
                    case 'RESTRICTED': color = Cesium.Color.ORANGE.withAlpha(0.2); break;
                    default: color = Cesium.Color.YELLOW.withAlpha(0.15);
                }

                // Build polygon positions from flat coord array
                const positions = [];
                for (let i = 0; i < zone.coords.length; i += 2) {
                    positions.push(Cesium.Cartesian3.fromDegrees(zone.coords[i], zone.coords[i + 1]));
                }

                ds.entities.add({
                    id: zone.id,
                    name: zone.name,
                    description: `
                        <table class="cesium-infoBox-defaultTable"><tbody>
                            <tr><th>Severity</th><td style="color:${zone.severity === 'PROHIBITED' ? 'red' : 'orange'}">${zone.severity}</td></tr>
                            <tr><th>Description</th><td>${zone.description}</td></tr>
                        </tbody></table>`,
                    polygon: {
                        hierarchy: new Cesium.PolygonHierarchy(positions),
                        material: color,
                        outline: true,
                        outlineColor: color.withAlpha(0.8),
                        outlineWidth: 2,
                        height: 0
                    }
                });

                // Center label
                const centerLon = zone.coords.filter((_, i) => i % 2 === 0).reduce((a, b) => a + b, 0) / (zone.coords.length / 2);
                const centerLat = zone.coords.filter((_, i) => i % 2 === 1).reduce((a, b) => a + b, 0) / (zone.coords.length / 2);
                ds.entities.add({
                    id: `${zone.id}-label`,
                    position: Cesium.Cartesian3.fromDegrees(centerLon, centerLat, 5000),
                    label: {
                        text: `⚠ ${zone.severity}`, font: 'bold 12px monospace',
                        fillColor: zone.severity === 'PROHIBITED' ? Cesium.Color.RED : Cesium.Color.ORANGE,
                        outlineColor: Cesium.Color.BLACK, outlineWidth: 3,
                        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 8000000)
                    }
                });
            });
        };

        render();
    }, [viewer, active]);

    return null;
};

export default NotamLayer;
