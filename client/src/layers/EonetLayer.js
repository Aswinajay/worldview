import React, { useEffect, useRef, useState } from 'react';
import * as Cesium from 'cesium';

const EonetLayer = ({ viewer, active, onCount, onLayerState }) => {
    const [events, setEvents] = useState([]);
    const dataSourceRef = useRef(null);

    useEffect(() => {
        if (!active) {
            if (onLayerState) onLayerState('eonet', null);
            return;
        }

        const fetchEvents = async () => {
            if (onLayerState) onLayerState('eonet', 'loading');
            try {
                const res = await fetch('/api/eonet');
                const data = await res.json();
                setEvents(data);
                if (onCount) onCount(data.length);
                if (onLayerState) onLayerState('eonet', 'live');
            } catch (err) {
                console.error('EONET fetch error:', err);
                if (onLayerState) onLayerState('eonet', 'error');
            }
        };
        fetchEvents();
        const interval = setInterval(fetchEvents, 1800000); // 30 mins
        return () => clearInterval(interval);
    }, [active]);

    useEffect(() => {
        if (!viewer) return;

        if (!active) {
            if (dataSourceRef.current) {
                viewer.dataSources.remove(dataSourceRef.current);
                dataSourceRef.current = null;
            }
            if (onCount) onCount(0);
            return;
        }

        const render = async () => {
            if (!dataSourceRef.current) {
                dataSourceRef.current = new Cesium.CustomDataSource('eonet');
                await viewer.dataSources.add(dataSourceRef.current);
            }
            const ds = dataSourceRef.current;
            ds.entities.removeAll();

            events.forEach(evt => {
                if (!evt.longitude || !evt.latitude) return;

                // Color based on NASA EONET Category
                let color = Cesium.Color.RED;
                const cat = evt.category;
                if (cat.includes('Volcanoes')) color = Cesium.Color.ORANGERED;
                else if (cat.includes('Wildfires')) color = Cesium.Color.FIREBRICK;
                else if (cat.includes('Severe Storms')) color = Cesium.Color.DODGERBLUE;
                else if (cat.includes('Sea and Lake Ice')) color = Cesium.Color.AQUA;

                ds.entities.add({
                    id: evt.id,
                    position: Cesium.Cartesian3.fromDegrees(evt.longitude, evt.latitude, 500),
                    name: evt.title,
                    description: `
                        <div class="tactical-info">
                            <div style="font-weight:700; color:${color.toCssColorString()}; margin-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.1)">
                                NASA EVENT: ${evt.category.toUpperCase()}
                            </div>
                            <table class="cesium-infoBox-defaultTable"><tbody>
                                <tr><th>Title</th><td>${evt.title}</td></tr>
                                <tr><th>Category</th><td>${evt.category}</td></tr>
                                <tr><th>Timestamp</th><td>${new Date(evt.time).toISOString()}</td></tr>
                                <tr><th>Source</th><td>EONET PLATFORM</td></tr>
                            </tbody></table>
                        </div>`,
                    billboard: {
                        // Generate a simple circular icon or use a colored dot if no image
                        image: createColoredCanvas(color.toCssColorString()),
                        scale: 0.5,
                        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 20000000)
                    },
                    label: {
                        text: evt.title,
                        font: '10px sans-serif',
                        fillColor: Cesium.Color.WHITE,
                        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                        outlineWidth: 2,
                        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                        pixelOffset: new Cesium.Cartesian2(0, -15),
                        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 5000000)
                    }
                });
            });
        };

        render();
    }, [viewer, active, events]);

    return null;
};

// Helper to generate a placeholder icon canvas since we don't have local icons atm
function createColoredCanvas(colorString) {
    const canvas = document.createElement('canvas');
    canvas.width = 30;
    canvas.height = 30;
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.arc(15, 15, 12, 0, 2 * Math.PI);
    ctx.fillStyle = colorString;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'white';
    ctx.stroke();
    return canvas;
}

export default EonetLayer;
