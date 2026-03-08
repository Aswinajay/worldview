import React, { useEffect, useState, useRef } from 'react';
import * as Cesium from 'cesium';

const FlightLayer = ({ viewer, active }) => {
    const [flights, setFlights] = useState([]);
    const dataSourceRef = useRef(null);

    // Fetch flights from API periodically
    useEffect(() => {
        if (!active) return;

        const fetchFlights = async () => {
            try {
                const res = await fetch('/api/flights');
                const data = await res.json();
                setFlights(data);
            } catch (err) {
                console.error('Failed to fetch flights:', err);
            }
        };

        fetchFlights();
        const interval = setInterval(fetchFlights, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, [active]);

    // Render flights to Cesium
    useEffect(() => {
        if (!viewer) return;

        if (!active) {
            if (dataSourceRef.current) {
                viewer.dataSources.remove(dataSourceRef.current);
                dataSourceRef.current = null;
            }
            return;
        }

        const renderData = async () => {
            if (!dataSourceRef.current) {
                dataSourceRef.current = new Cesium.CustomDataSource('flights');
                await viewer.dataSources.add(dataSourceRef.current);
            }

            const ds = dataSourceRef.current;

            // Keep track of which flights we updated
            const updatedIds = new Set();

            flights.forEach(flight => {
                if (!flight.longitude || !flight.latitude) return;

                const id = `flight-${flight.icao24}`;
                updatedIds.add(id);

                const position = Cesium.Cartesian3.fromDegrees(
                    flight.longitude,
                    flight.latitude,
                    flight.altitude || 10000 // default to 10k meters if unknown
                );

                // Calculate heading quaternion for the icon rotation
                const heading = Cesium.Math.toRadians(flight.heading || 0);
                const pitch = 0;
                const roll = 0;
                const hpr = new Cesium.HeadingPitchRoll(heading, pitch, roll);
                const orientation = Cesium.Transforms.headingPitchRollQuaternion(position, hpr);

                const entity = ds.entities.getById(id);

                // Metadata for info popup
                const description = `
          <table class="cesium-infoBox-defaultTable">
            <tbody>
              <tr><th>Callsign</th><td>${flight.callsign || 'Unknown'}</td></tr>
              <tr><th>Country</th><td>${flight.origin_country || 'Unknown'}</td></tr>
              <tr><th>Altitude</th><td>${flight.altitude ? Math.round(flight.altitude) + ' m' : 'N/A'}</td></tr>
              <tr><th>Velocity</th><td>${flight.velocity ? Math.round(flight.velocity * 3.6) + ' km/h' : 'N/A'}</td></tr>
              <tr><th>Heading</th><td>${flight.heading ? Math.round(flight.heading) + '°' : 'N/A'}</td></tr>
            </tbody>
          </table>
        `;

                // Color based on altitude (blue = low, green = mid, yellow = high, red = very high)
                let color = Cesium.Color.DODGERBLUE;
                if (flight.altitude > 10000) color = Cesium.Color.CRIMSON;
                else if (flight.altitude > 7000) color = Cesium.Color.GOLD;
                else if (flight.altitude > 3000) color = Cesium.Color.LIMEGREEN;

                if (entity) {
                    // Update existing
                    entity.position = position;
                    entity.orientation = orientation;
                    entity.description = description;
                    entity.point.color = color;
                } else {
                    // Create new
                    ds.entities.add({
                        id: id,
                        name: flight.callsign || flight.icao24,
                        position: position,
                        orientation: orientation,
                        description: description,
                        point: {
                            pixelSize: 8,
                            color: color,
                            outlineColor: Cesium.Color.WHITE,
                            outlineWidth: 1,
                            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0.0, 5000000.0) // only visible somewhat close
                        },
                        path: {
                            resolution: 1,
                            material: new Cesium.PolylineGlowMaterialProperty({
                                glowPower: 0.1,
                                color: color
                            }),
                            width: 2,
                            leadTime: 0,
                            trailTime: 60 // show path for last 60 seconds
                        }
                    });
                }
            });

            // Remove stale flights not in the current update
            const entitiesToRemove = [];
            ds.entities.values.forEach(entity => {
                if (!updatedIds.has(entity.id)) {
                    entitiesToRemove.push(entity.id);
                }
            });
            entitiesToRemove.forEach(id => ds.entities.removeById(id));
        };

        renderData();
    }, [viewer, flights, active]);

    return null; // This component handles rendering inside the Cesium canvas directly
};

export default FlightLayer;
