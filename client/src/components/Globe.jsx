import React, { useEffect, useRef, useState } from 'react';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import FlightLayer from '../layers/FlightLayer';
import MaritimeLayer from '../layers/MaritimeLayer';
import SatelliteLayer from '../layers/SatelliteLayer';
import EarthquakeLayer from '../layers/EarthquakeLayer';
import EonetLayer from '../layers/EonetLayer';
import NotamLayer from '../layers/NotamLayer';
import InternetLayer from '../layers/InternetLayer';
import RouteLayer from '../layers/RouteLayer';
import AirportLayer from '../layers/AirportLayer';
import MaritimeRouteLayer from '../layers/MaritimeRouteLayer';
import PortLayer from '../layers/PortLayer';

Cesium.Ion.defaultAccessToken = 'YOUR_CESIUM_ION_TOKEN';

const Globe = ({ layers, currentTime, onMouseMove, onViewerReady, onLayerCount, onLayerState }) => {
    const cesiumContainer = useRef(null);
    const [viewer, setViewer] = useState(null);
    const selectedGroundLineRef = useRef(null);

    useEffect(() => {
        if (!cesiumContainer.current || viewer) return;

        const v = new Cesium.Viewer(cesiumContainer.current, {
            animation: false,
            baseLayerPicker: false,
            fullscreenButton: false,
            geocoder: false,
            homeButton: false,
            infoBox: true,
            sceneModePicker: false,
            selectionIndicator: true,
            timeline: false,
            navigationHelpButton: false,
            navigationInstructionsInitiallyVisible: false,
            scene3DOnly: true,
            skyAtmosphere: new Cesium.SkyAtmosphere(),
        });

        v.scene.globe.enableLighting = true;
        v.scene.backgroundColor = Cesium.Color.fromCssColorString('#0a0a1a');
        v.scene.globe.baseColor = Cesium.Color.fromCssColorString('#1a1a2e');

        // Selection Change Handler (Highlight selected + Ground Line)
        v.selectedEntityChanged.addEventListener((entity) => {
            if (selectedGroundLineRef.current) {
                v.entities.remove(selectedGroundLineRef.current);
                selectedGroundLineRef.current = null;
            }

            if (entity && entity.position) {
                // If it's an airborne asset (has altitude), draw a line to ground
                const pos = entity.position.getValue(v.clock.currentTime);
                if (pos) {
                    const cartographic = Cesium.Cartographic.fromCartesian(pos);
                    if (cartographic.height > 100) { // Only if significantly above ground
                        selectedGroundLineRef.current = v.entities.add({
                            name: 'Ground Track',
                            polyline: {
                                positions: new Cesium.CallbackProperty(() => {
                                    const currentPos = entity.position.getValue(v.clock.currentTime);
                                    if (!currentPos) return [];
                                    const carto = Cesium.Cartographic.fromCartesian(currentPos);
                                    return [
                                        currentPos,
                                        Cesium.Cartesian3.fromDegrees(
                                            Cesium.Math.toDegrees(carto.longitude),
                                            Cesium.Math.toDegrees(carto.latitude),
                                            0
                                        )
                                    ];
                                }, false),
                                width: 1,
                                material: new Cesium.PolylineDashMaterialProperty({
                                    color: Cesium.Color.WHITE.withAlpha(0.5),
                                    dashLength: 16
                                })
                            }
                        });
                    }
                }
            }
        });

        // Mouse Move Handler
        const handler = new Cesium.ScreenSpaceEventHandler(v.scene.canvas);
        handler.setInputAction((movement) => {
            const cartesian = v.camera.pickEllipsoid(movement.endPosition, v.scene.globe.ellipsoid);
            if (cartesian) {
                const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
                const lat = Cesium.Math.toDegrees(cartographic.latitude);
                const lon = Cesium.Math.toDegrees(cartographic.longitude);
                onMouseMove({ lat, lon });
            }
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

        setViewer(v);
        if (onViewerReady) onViewerReady(v);

        return () => {
            handler.destroy();
            v.destroy();
        };
    }, []);

    // Handle base layer changes
    useEffect(() => {
        if (!viewer) return;

        const updateBaseLayer = async () => {
            const layersCollection = viewer.imageryLayers;
            layersCollection.removeAll();

            if (layers.baseLayer === 'dark') {
                layersCollection.addImageryProvider(
                    new Cesium.UrlTemplateImageryProvider({
                        url: 'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
                        credit: '© CartoDB © OpenStreetMap'
                    })
                );
            } else if (layers.baseLayer === 'satellite') {
                // Use Esri World Imagery (free, no token, actual satellite tiles)
                layersCollection.addImageryProvider(
                    new Cesium.UrlTemplateImageryProvider({
                        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                        credit: '© Esri, Maxar, Earthstar Geographics'
                    })
                );
            } else {
                // Terrain: Use OpenTopoMap which shows elevation contours
                layersCollection.addImageryProvider(
                    new Cesium.UrlTemplateImageryProvider({
                        url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
                        subdomains: 'abc',
                        credit: '© OpenTopoMap contributors'
                    })
                );
            }

            // BUG FIX #4: Add actual terrain elevation for terrain mode
            if (layers.baseLayer === 'terrain') {
                try {
                    viewer.terrainProvider = await Cesium.CesiumTerrainProvider.fromUrl(
                        'https://s3.amazonaws.com/cesiumjs/smallTerrain'
                    );
                } catch (e) {
                    viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider();
                }
            } else {
                viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider();
            }
        };

        updateBaseLayer();
    }, [viewer, layers.baseLayer]);

    return (
        <div ref={cesiumContainer} style={{ width: '100%', height: '100%' }}>
            {viewer && (
                <>
                    <FlightLayer viewer={viewer} active={layers.flights} currentTime={currentTime} onCount={(c) => onLayerCount('flights', c)} onLayerState={onLayerState} />
                    <MaritimeLayer viewer={viewer} active={layers.maritime} onCount={(c) => onLayerCount('maritime', c)} onLayerState={onLayerState} />
                    <SatelliteLayer viewer={viewer} active={layers.satellites} onCount={(c) => onLayerCount('satellites', c)} onLayerState={onLayerState} />
                    <EarthquakeLayer viewer={viewer} active={layers.earthquakes} onCount={(c) => onLayerCount('earthquakes', c)} onLayerState={onLayerState} />
                    <EonetLayer viewer={viewer} active={layers.eonet} onCount={(c) => onLayerCount('eonet', c)} onLayerState={onLayerState} />
                    <NotamLayer viewer={viewer} active={layers.notams} onCount={(c) => onLayerCount('notams', c)} onLayerState={onLayerState} />
                    <InternetLayer viewer={viewer} active={layers.internet} onCount={(c) => onLayerCount('internet', c)} onLayerState={onLayerState} />
                    <RouteLayer viewer={viewer} active={layers.routes} onLayerState={onLayerState} />
                    <AirportLayer viewer={viewer} active={layers.airports} onCount={(c) => onLayerCount('airports', c)} onLayerState={onLayerState} />
                    <MaritimeRouteLayer viewer={viewer} active={layers.maritimeLanes} onLayerState={onLayerState} />
                    <PortLayer viewer={viewer} active={layers.ports} onCount={(c) => onLayerCount('ports', c)} onLayerState={onLayerState} />
                </>
            )}
        </div>
    );
};

export default Globe;
