import React, { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';

// Simulated GPS jamming zones based on known interference hotspots
const JAMMING_ZONES = [
    { lat: 36.0, lon: 37.0, intensity: 0.9, label: 'Syria/Turkey Border' },
    { lat: 34.5, lon: 36.2, intensity: 0.8, label: 'Eastern Mediterranean' },
    { lat: 50.0, lon: 30.5, intensity: 0.85, label: 'Ukraine Conflict Zone' },
    { lat: 48.0, lon: 37.8, intensity: 0.7, label: 'Donbas Region' },
    { lat: 59.9, lon: 30.3, intensity: 0.5, label: 'Baltic States' },
    { lat: 32.0, lon: 34.8, intensity: 0.6, label: 'Israel/Palestine' },
    { lat: 33.3, lon: 44.3, intensity: 0.4, label: 'Baghdad Region' },
    { lat: 25.2, lon: 55.3, intensity: 0.3, label: 'Persian Gulf' },
    { lat: 64.0, lon: 26.0, intensity: 0.4, label: 'Finland/Russia Border' },
    { lat: 35.7, lon: 51.4, intensity: 0.35, label: 'Tehran' },
];

const GpsJamLayer = ({ viewer, active }) => {
    const dataSourceRef = useRef(null);

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
                dataSourceRef.current = new Cesium.CustomDataSource('gpsJam');
                await viewer.dataSources.add(dataSourceRef.current);
            }
            const ds = dataSourceRef.current;
            ds.entities.removeAll();

            JAMMING_ZONES.forEach((zone, i) => {
                const alpha = zone.intensity * 0.45;
                const size = 1.5 + zone.intensity * 2; // degrees

                ds.entities.add({
                    id: `jam-${i}`,
                    name: `GPS Jamming: ${zone.label}`,
                    description: `
                        <table class="cesium-infoBox-defaultTable"><tbody>
                            <tr><th>Region</th><td>${zone.label}</td></tr>
                            <tr><th>Interference Level</th><td>${Math.round(zone.intensity * 100)}%</td></tr>
                            <tr><th>Source</th><td>ADS-B Nav Accuracy Reports</td></tr>
                        </tbody></table>`,
                    rectangle: {
                        coordinates: Cesium.Rectangle.fromDegrees(
                            zone.lon - size, zone.lat - size,
                            zone.lon + size, zone.lat + size
                        ),
                        material: Cesium.Color.RED.withAlpha(alpha),
                        outline: true,
                        outlineColor: Cesium.Color.RED.withAlpha(alpha + 0.2),
                        outlineWidth: 1,
                        height: 0
                    }
                });

                // Add a pulsing center point
                ds.entities.add({
                    id: `jam-center-${i}`,
                    position: Cesium.Cartesian3.fromDegrees(zone.lon, zone.lat, 1000),
                    point: {
                        pixelSize: 8,
                        color: Cesium.Color.RED.withAlpha(0.9),
                        outlineColor: Cesium.Color.YELLOW,
                        outlineWidth: 2,
                        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 10000000)
                    },
                    label: {
                        text: zone.label, font: '10px monospace',
                        fillColor: Cesium.Color.RED,
                        outlineColor: Cesium.Color.BLACK, outlineWidth: 2,
                        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                        pixelOffset: new Cesium.Cartesian2(12, 0),
                        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 5000000)
                    }
                });
            });
        };

        render();
    }, [viewer, active]);

    return null;
};

export default GpsJamLayer;
