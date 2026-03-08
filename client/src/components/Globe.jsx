import React, { useEffect, useRef, useState } from 'react';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import FlightLayer from '../layers/FlightLayer';

// You will need to replace this with your actual Cesium Ion access token
Cesium.Ion.defaultAccessToken = 'YOUR_CESIUM_ION_TOKEN';

const Globe = ({ layers }) => {
    const cesiumContainer = useRef(null);
    const [viewer, setViewer] = useState(null);

    useEffect(() => {
        if (!cesiumContainer.current || viewer) return;

        // Initialize the Cesium Viewer
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
            skyBox: new Cesium.SkyBox({
                sources: {
                    positiveX: '/assets/skybox/px.jpg',
                    negativeX: '/assets/skybox/nx.jpg',
                    positiveY: '/assets/skybox/py.jpg',
                    negativeY: '/assets/skybox/ny.jpg',
                    positiveZ: '/assets/skybox/pz.jpg',
                    negativeZ: '/assets/skybox/nz.jpg'
                }
            })
        });

        // Make the globe look more "cyber/dark" by default if needed
        v.scene.globe.enableLighting = true;
        v.scene.highDynamicRange = true;

        // Remove the default terrain provider (it can sometimes be slow)
        // We will handle base layers in the effect below

        setViewer(v);

        return () => {
            v.destroy();
        };
    }, []);

    // Handle Base Layer Changes
    useEffect(() => {
        if (!viewer) return;

        const updateBaseLayer = async () => {
            const layersCollection = viewer.imageryLayers;
            layersCollection.removeAll();

            // Setup a default free OpenStreetMap base layer
            const osmProvider = new Cesium.OpenStreetMapImageryProvider({
                url: 'https://a.tile.openstreetmap.org/'
            });
            layersCollection.addImageryProvider(osmProvider);

            if (layers.baseLayer === 'terrain') {
                try {
                    // Try to load world terrain, will fail gracefully without token but map will still show
                    viewer.terrainProvider = await Cesium.createWorldTerrainAsync();
                } catch (e) {
                    console.log("No terrain access without Ion token, using ellipsoid");
                    viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider();
                }
            } else {
                viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider();
            }
        };

        updateBaseLayer();
    }, [viewer, layers.baseLayer]);

    // Expose viewer for child layer components
    return (
        <div ref={cesiumContainer} style={{ width: '100%', height: '100%' }}>
            {viewer && (
                <FlightLayer viewer={viewer} active={layers.flights} />
            )}
        </div>
    );
};

export default Globe;
