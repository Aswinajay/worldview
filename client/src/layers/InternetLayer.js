import React, { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';

// Simulated internet outage data (inspired by real IODA patterns)
const OUTAGE_DATA = [
    { country: 'Syria', code: 'SY', score: 0.15, coords: [38.9, 35.0] },
    { country: 'Yemen', code: 'YE', score: 0.2, coords: [48.5, 15.5] },
    { country: 'Myanmar', code: 'MM', score: 0.35, coords: [96.0, 19.7] },
    { country: 'Ethiopia', code: 'ET', score: 0.4, coords: [39.6, 9.0] },
    { country: 'Iran', code: 'IR', score: 0.55, coords: [53.6, 32.4] },
    { country: 'Sudan', code: 'SD', score: 0.3, coords: [30.2, 15.5] },
    { country: 'Cuba', code: 'CU', score: 0.6, coords: [-79.5, 21.5] },
    { country: 'North Korea', code: 'KP', score: 0.05, coords: [127.5, 40.3] },
    { country: 'Turkmenistan', code: 'TM', score: 0.25, coords: [59.5, 38.9] },
    { country: 'Eritrea', code: 'ER', score: 0.15, coords: [39.7, 15.2] },
];

const InternetLayer = ({ viewer, active, onCount }) => {
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

        if (onCount) onCount(OUTAGE_DATA.length);
        const render = async () => {
            if (!dataSourceRef.current) {
                dataSourceRef.current = new Cesium.CustomDataSource('internet');
                await viewer.dataSources.add(dataSourceRef.current);
            }
            const ds = dataSourceRef.current;
            ds.entities.removeAll();

            OUTAGE_DATA.forEach((item, i) => {
                // Color: green (good) → red (outage)
                const r = 1 - item.score;
                const g = item.score;
                const color = new Cesium.Color(r, g * 0.3, 0, 0.5);
                const size = 3; // degrees radius

                ds.entities.add({
                    id: `internet-${item.code}`,
                    name: `Internet: ${item.country}`,
                    description: `
                        <table class="cesium-infoBox-defaultTable"><tbody>
                            <tr><th>Country</th><td>${item.country}</td></tr>
                            <tr><th>Connectivity Score</th><td>${Math.round(item.score * 100)}%</td></tr>
                            <tr><th>Status</th><td style="color:${item.score < 0.3 ? 'red' : item.score < 0.5 ? 'orange' : 'green'}">${item.score < 0.3 ? 'SEVERE DISRUPTION' : item.score < 0.5 ? 'PARTIAL OUTAGE' : 'DEGRADED'}</td></tr>
                            <tr><th>Source</th><td>IODA / Simulated</td></tr>
                        </tbody></table>`,
                    position: Cesium.Cartesian3.fromDegrees(item.coords[0], item.coords[1], 0),
                    ellipse: {
                        semiMajorAxis: size * 111000,
                        semiMinorAxis: size * 111000,
                        material: color,
                        outline: true,
                        outlineColor: color.withAlpha(0.8),
                        height: 0
                    },
                    label: {
                        text: `${item.country} ${Math.round(item.score * 100)}%`,
                        font: '10px monospace',
                        fillColor: item.score < 0.3 ? Cesium.Color.RED : Cesium.Color.ORANGE,
                        outlineColor: Cesium.Color.BLACK, outlineWidth: 2,
                        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                        pixelOffset: new Cesium.Cartesian2(0, -20),
                        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 10000000)
                    }
                });
            });
        };

        render();
    }, [viewer, active]);

    return null;
};

export default InternetLayer;
