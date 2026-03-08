import React, { useEffect, useRef, useState } from 'react';
import * as Cesium from 'cesium';

const ConflictLayer = ({ viewer, active }) => {
    const [events, setEvents] = useState([]);
    const dataSourceRef = useRef(null);

    useEffect(() => {
        if (!active) return;
        const fetchEvents = async () => {
            try {
                const res = await fetch('/api/events');
                setEvents(await res.json());
            } catch (err) { console.error('Events fetch error:', err); }
        };
        fetchEvents();
        const interval = setInterval(fetchEvents, 30000);
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
                dataSourceRef.current = new Cesium.CustomDataSource('conflicts');
                await viewer.dataSources.add(dataSourceRef.current);
            }
            const ds = dataSourceRef.current;
            ds.entities.removeAll();

            // If no events from API, show some demo markers
            const data = events.length > 0 ? events : DEMO_EVENTS;

            data.forEach((evt, i) => {
                if (!evt.longitude || !evt.latitude) return;

                let color;
                const sev = evt.severity || 3;
                if (sev >= 4) color = Cesium.Color.RED;
                else if (sev >= 3) color = Cesium.Color.ORANGE;
                else if (sev >= 2) color = Cesium.Color.YELLOW;
                else color = Cesium.Color.CYAN;

                ds.entities.add({
                    id: `event-${evt.id || i}`,
                    name: evt.title || 'Event',
                    position: Cesium.Cartesian3.fromDegrees(evt.longitude, evt.latitude, 0),
                    description: `
                        <table class="cesium-infoBox-defaultTable"><tbody>
                            <tr><th>Type</th><td>${evt.type || 'Unknown'}</td></tr>
                            <tr><th>Title</th><td>${evt.title}</td></tr>
                            <tr><th>Description</th><td>${evt.description || 'N/A'}</td></tr>
                            <tr><th>Severity</th><td>${'⚠'.repeat(sev)} (${sev}/5)</td></tr>
                            <tr><th>Time</th><td>${evt.timestamp || 'N/A'}</td></tr>
                        </tbody></table>`,
                    billboard: {
                        image: createMarkerCanvas(color),
                        pixelOffset: new Cesium.Cartesian2(0, -16),
                        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 15000000),
                        width: 24, height: 32
                    },
                    label: {
                        text: evt.title || 'Event', font: '11px monospace',
                        fillColor: color,
                        outlineColor: Cesium.Color.BLACK, outlineWidth: 2,
                        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                        pixelOffset: new Cesium.Cartesian2(16, -16),
                        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 5000000)
                    }
                });

                // Add a pulsing ring for high severity
                if (sev >= 4 && evt.radius) {
                    ds.entities.add({
                        id: `event-radius-${evt.id || i}`,
                        position: Cesium.Cartesian3.fromDegrees(evt.longitude, evt.latitude, 0),
                        ellipse: {
                            semiMajorAxis: evt.radius * 1000,
                            semiMinorAxis: evt.radius * 1000,
                            material: color.withAlpha(0.1),
                            outline: true, outlineColor: color.withAlpha(0.5),
                            height: 0
                        }
                    });
                }
            });
        };

        render();
    }, [viewer, events, active]);

    return null;
};

// Create a simple marker icon as a canvas data URL
function createMarkerCanvas(cesiumColor) {
    const canvas = document.createElement('canvas');
    canvas.width = 24;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');

    const r = Math.round(cesiumColor.red * 255);
    const g = Math.round(cesiumColor.green * 255);
    const b = Math.round(cesiumColor.blue * 255);
    const cssColor = `rgb(${r},${g},${b})`;

    // Draw a pin shape
    ctx.beginPath();
    ctx.moveTo(12, 32);
    ctx.bezierCurveTo(12, 20, 0, 16, 0, 8);
    ctx.arc(12, 8, 12, Math.PI, 0, false);
    ctx.bezierCurveTo(24, 16, 12, 20, 12, 32);
    ctx.fillStyle = cssColor;
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.stroke();

    // White center dot
    ctx.beginPath();
    ctx.arc(12, 8, 4, 0, 2 * Math.PI);
    ctx.fillStyle = '#fff';
    ctx.fill();

    return canvas.toDataURL();
}

const DEMO_EVENTS = [
    { id: 'd1', type: 'conflict', title: 'Active Conflict Zone', description: 'Ongoing military operations', severity: 5, longitude: 36.2, latitude: 49.0, radius: 200 },
    { id: 'd2', type: 'conflict', title: 'Humanitarian Crisis', description: 'Displaced population movement', severity: 4, longitude: 46.7, latitude: 33.3, radius: 150 },
    { id: 'd3', type: 'incident', title: 'Maritime Incident', description: 'Vessel seizure reported', severity: 3, longitude: 56.0, latitude: 26.5, radius: 50 },
    { id: 'd4', type: 'protest', title: 'Civil Unrest', description: 'Large-scale protests', severity: 2, longitude: 51.4, latitude: 35.7, radius: 30 },
    { id: 'd5', type: 'cyber', title: 'Cyber Attack', description: 'Critical infrastructure targeted', severity: 4, longitude: 24.7, latitude: 59.4, radius: 100 },
];

export default ConflictLayer;
