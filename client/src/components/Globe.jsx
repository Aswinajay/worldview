import React, { useEffect, useRef, useState } from 'react';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import FlightLayer from '../layers/FlightLayer';
import MaritimeLayer from '../layers/MaritimeLayer';
import SatelliteLayer from '../layers/SatelliteLayer';
import GpsJamLayer from '../layers/GpsJamLayer';
import NotamLayer from '../layers/NotamLayer';
import InternetLayer from '../layers/InternetLayer';
import ConflictLayer from '../layers/ConflictLayer';

Cesium.Ion.defaultAccessToken = 'YOUR_CESIUM_ION_TOKEN';

const Globe = ({ layers, currentTime, onMouseMove, onViewerReady, onLayerCount }) => {
    const cesiumContainer = useRef(null);
    const [viewer, setViewer] = useState(null);

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

        // BUG FIX #1: Live coordinate display on mouse move
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
                    <FlightLayer viewer={viewer} active={layers.flights} currentTime={currentTime} onCount={(c) => onLayerCount('flights', c)} />
                    <MaritimeLayer viewer={viewer} active={layers.maritime} onCount={(c) => onLayerCount('maritime', c)} />
                    <SatelliteLayer viewer={viewer} active={layers.satellites} onCount={(c) => onLayerCount('satellites', c)} />
                    <GpsJamLayer viewer={viewer} active={layers.gpsJam} onCount={(c) => onLayerCount('gpsJam', c)} />
                    <NotamLayer viewer={viewer} active={layers.notams} onCount={(c) => onLayerCount('notams', c)} />
                    <InternetLayer viewer={viewer} active={layers.internet} onCount={(c) => onLayerCount('internet', c)} />
                    <ConflictLayer viewer={viewer} active={layers.conflicts} onCount={(c) => onLayerCount('conflicts', c)} />
                </>
            )}
        </div>
    );
};

export default Globe;
