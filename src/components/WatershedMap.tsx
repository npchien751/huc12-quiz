import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import {
  getAllFeatures,
  getFeaturesByState,
  getFeaturesByHuc6,
  getFeaturesByBasin,
} from '../lib/geo-utils';
import { getBasinColor } from '../constants/basins';
import { useAppStore } from '../lib/store';

export default function WatershedMap() {
  const containerRef = useRef<any>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const webViewRef = useRef<any>(null);
  const quiz = useAppStore((s) => s.quiz);
  const revealedIds = useAppStore((s) => s.revealedIds);
  const showAllNames = useAppStore((s) => s.showAllNames);
  const tapPolygon = useAppStore((s) => s.tapPolygon);
  const filterType = useAppStore((s) => s.filterType);
  const filterValue = useAppStore((s) => s.filterValue);

  const features = useMemo(() => {
    if (filterType === 'state' && filterValue) return getFeaturesByState(filterValue);
    if (filterType === 'huc06' && filterValue) return getFeaturesByHuc6(filterValue);
    if (filterType === 'huc08' && filterValue) return getFeaturesByBasin(filterValue);
    return getAllFeatures();
  }, [filterType, filterValue]);

  // Build style state
  const styleState = useMemo(() => {
    const result: Record<string, { fill: string; stroke: string; strokeWidth: number; showLabel: boolean }> = {};

    for (const f of features) {
      const huc12 = f.properties.huc12;
      const basinColor = getBasinColor(f.properties.huc8_code);

      let fill = basinColor + '4D';
      let stroke = '#ffffff';
      let strokeWidth = 1;
      let showLabel = false;

      if (quiz) {
        if (quiz.mode === 'explore') {
          const isRevealed = revealedIds.has(huc12) || showAllNames;
          fill = isRevealed ? basinColor + '80' : basinColor + '4D';
          strokeWidth = isRevealed ? 2 : 1;
          showLabel = isRevealed;
        } else {
          if (quiz.found.has(huc12)) {
            fill = '#22c55e80';
            strokeWidth = 1.5;
            showLabel = true;
          } else if (quiz.missed.has(huc12)) {
            fill = '#ef444466';
            strokeWidth = 1.5;
            showLabel = true;
          } else if (quiz.mode === 'name-the-tap' && quiz.current?.huc12 === huc12) {
            fill = '#f59e0b99';
            stroke = '#fbbf24';
            strokeWidth = 3;
          }
        }
      }

      result[huc12] = { fill, stroke, strokeWidth, showLabel };
    }
    return result;
  }, [features, quiz, revealedIds, showAllNames]);

  const geojsonData = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: features.map((f) => ({
      type: 'Feature' as const,
      properties: {
        ...f.properties,
        _basinColor: getBasinColor(f.properties.huc8_code),
      },
      geometry: f.geometry,
    })),
  }), [features]);

  const htmlContent = useMemo(
    () => buildLeafletHTML(geojsonData, styleState, Platform.OS === 'web'),
    [geojsonData]
  );

  // Handle messages from the iframe/webview
  const handleTap = useCallback((huc12: string) => {
    tapPolygon(huc12);
  }, [tapPolygon]);

  // Listen for postMessage from iframe (web only)
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handler = (event: MessageEvent) => {
      try {
        const msg = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (msg.type === 'polygon_tap') {
          handleTap(msg.huc12);
        }
      } catch {}
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [handleTap]);

  // Send style updates to iframe/webview
  useEffect(() => {
    const js = `if(window.updateStyles)window.updateStyles(${JSON.stringify(styleState)});true;`;

    if (Platform.OS === 'web') {
      iframeRef.current?.contentWindow?.postMessage(
        { type: 'updateStyles', styles: styleState },
        '*'
      );
    } else {
      webViewRef.current?.injectJavaScript(js);
    }
  }, [styleState]);

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <iframe
          ref={(el: any) => { iframeRef.current = el; }}
          srcDoc={htmlContent}
          style={{ width: '100%', height: '100%', border: 'none', backgroundColor: '#f8f8f8' } as any}
        />
      </View>
    );
  }

  // Native: use WebView
  const WebView = require('react-native-webview').WebView;
  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: htmlContent }}
        style={styles.webview}
        onMessage={(event: { nativeEvent: { data: string } }) => {
          try {
            const msg = JSON.parse(event.nativeEvent.data);
            if (msg.type === 'polygon_tap') {
              handleTap(msg.huc12);
            }
          } catch {}
        }}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        originWhitelist={['*']}
        mixedContentMode="always"
      />
    </View>
  );
}

function buildLeafletHTML(
  geojson: object,
  initialStyles: Record<string, { fill: string; stroke: string; strokeWidth: number; showLabel: boolean }>,
  isWeb: boolean
): string {
  const postMessageCode = isWeb
    ? `window.parent.postMessage(JSON.stringify({type:'polygon_tap',huc12:huc12}),'*')`
    : `window.ReactNativeWebView.postMessage(JSON.stringify({type:'polygon_tap',huc12:huc12}))`;

  const listenCode = isWeb
    ? `window.addEventListener('message',function(e){
        try{
          var d=typeof e.data==='string'?JSON.parse(e.data):e.data;
          if(d.type==='updateStyles'&&window.updateStyles)window.updateStyles(d.styles);
        }catch(ex){}
      });`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body, #map { width: 100%; height: 100%; background: #f8f8f8; }
  .watershed-label {
    background: rgba(0,0,0,0.75);
    color: #fff;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    white-space: nowrap;
    pointer-events: none;
    border: none;
    box-shadow: none;
  }
  .leaflet-control-attribution { display: none !important; }
</style>
</head>
<body>
<div id="map"></div>
<script>
  var geojsonData = ${JSON.stringify(geojson)};
  var currentStyles = ${JSON.stringify(initialStyles)};

  // Default to New England center; fitBounds will override once data loads
  var map = L.map('map', {
    zoomControl: false,
    attributionControl: false,
    maxBoundsViscosity: 1.0,
  }).setView([44.0, -71.5], 7);

  L.tileLayer('https://tiles.stadiamaps.com/tiles/osm_bright/{z}/{x}/{y}{r}.png', {
    maxZoom: 16,
    minZoom: 5,
  }).addTo(map);

  var layers = {};
  var labels = {};

  var geojsonLayer = L.geoJSON(geojsonData, {
    style: function(feature) {
      var huc12 = feature.properties.huc12;
      var s = currentStyles[huc12];
      return {
        fillColor: s ? s.fill : feature.properties._basinColor + '4D',
        color: s ? s.stroke : '#ffffff',
        weight: s ? s.strokeWidth : 1,
        fillOpacity: 1,
        opacity: 0.8,
      };
    },
    onEachFeature: function(feature, layer) {
      var huc12 = feature.properties.huc12;
      layers[huc12] = layer;

      layer.on('click', function() {
        ${postMessageCode};
      });

      var labelPoint = [feature.properties.label_lat, feature.properties.label_lng];
      var label = L.marker(labelPoint, {
        icon: L.divIcon({
          className: '',
          html: '<div class="watershed-label">' + feature.properties.name + '</div>',
          iconSize: null,
          iconAnchor: [0, 0],
        }),
        interactive: false,
      });
      labels[huc12] = label;

      if (currentStyles[huc12] && currentStyles[huc12].showLabel) {
        label.addTo(map);
      }
    }
  }).addTo(map);

  // Auto-fit to the data bounds
  if (geojsonLayer.getLayers().length > 0) {
    map.fitBounds(geojsonLayer.getBounds().pad(0.05));
  }

  window.updateStyles = function(newStyles) {
    currentStyles = newStyles;
    for (var huc12 in layers) {
      var s = newStyles[huc12];
      if (!s) continue;
      layers[huc12].setStyle({
        fillColor: s.fill,
        color: s.stroke,
        weight: s.strokeWidth,
        fillOpacity: 1,
        opacity: 0.8,
      });
      if (s.showLabel) {
        if (!map.hasLayer(labels[huc12])) labels[huc12].addTo(map);
      } else {
        if (map.hasLayer(labels[huc12])) map.removeLayer(labels[huc12]);
      }
    }
  };

  ${listenCode}
<\/script>
</body>
</html>`;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  webview: { flex: 1, backgroundColor: '#f8f8f8' },
});
