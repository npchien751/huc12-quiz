import geodata from '../data/ct_huc12.json';

export interface Watershed {
  huc12: string;
  name: string;
  huc8Code: string;
  huc8Name: string;
  labelLat: number;
  labelLng: number;
}

export interface WatershedFeature {
  type: 'Feature';
  properties: {
    huc12: string;
    name: string;
    huc8_code: string;
    huc8_name: string;
    label_lat: number;
    label_lng: number;
  };
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
}

export interface GeoData {
  type: 'FeatureCollection';
  features: WatershedFeature[];
}

const data = geodata as GeoData;

export function getAllFeatures(): WatershedFeature[] {
  return data.features;
}

export function getFeaturesByBasin(huc8Code: string): WatershedFeature[] {
  return data.features.filter(
    (f) => f.properties.huc8_code === huc8Code
  );
}

export function featureToWatershed(f: WatershedFeature): Watershed {
  return {
    huc12: f.properties.huc12,
    name: f.properties.name,
    huc8Code: f.properties.huc8_code,
    huc8Name: f.properties.huc8_name,
    labelLat: f.properties.label_lat,
    labelLng: f.properties.label_lng,
  };
}

export function getAllWatersheds(): Watershed[] {
  return data.features.map(featureToWatershed);
}

export function getWatershedsByBasin(huc8Code: string): Watershed[] {
  return getFeaturesByBasin(huc8Code).map(featureToWatershed);
}

export function getPolygonCoords(
  feature: WatershedFeature
): { latitude: number; longitude: number }[][] {
  if (feature.geometry.type === 'Polygon') {
    return (feature.geometry.coordinates as number[][][]).map((ring) =>
      ring.map(([lng, lat]) => ({ latitude: lat, longitude: lng }))
    );
  } else {
    // MultiPolygon: flatten to array of rings
    const coords = feature.geometry.coordinates as number[][][][];
    return coords.flatMap((polygon) =>
      polygon.map((ring) =>
        ring.map(([lng, lat]) => ({ latitude: lat, longitude: lng }))
      )
    );
  }
}

export function getBoundingBox(features: WatershedFeature[]): {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
} {
  let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;

  for (const f of features) {
    const lat = f.properties.label_lat;
    const lng = f.properties.label_lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }

  const padding = 0.05;
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: (maxLat - minLat) + padding * 2,
    longitudeDelta: (maxLng - minLng) + padding * 2,
  };
}

// Normalize a name for matching (lowercase, strip non-alphanumeric)
export function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Check if typed input matches a watershed name
export function matchesName(input: string, watershedName: string): boolean {
  const normalizedInput = normalizeName(input);
  const normalizedName = normalizeName(watershedName);

  if (normalizedInput === normalizedName) return true;

  // Also match without common suffixes like "river", "brook", "creek", "pond", "lake"
  const withoutSuffix = normalizedName
    .replace(/(river|brook|creek|pond|lake|reservoir)$/, '');
  if (normalizedInput === withoutSuffix && withoutSuffix.length >= 4) return true;

  return false;
}
