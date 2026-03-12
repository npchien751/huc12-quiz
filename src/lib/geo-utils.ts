import geodata from '../data/ne_huc12.json';
import { BasinInfo, getBasinColor, getHuc6Color } from '../constants/basins';

export interface Watershed {
  huc12: string;
  name: string;
  state: string;
  huc6Code: string;
  huc6Name: string;
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
    state: string;
    huc6_code: string;
    huc6_name: string;
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

// ── Feature accessors ─────────────────────────────────────────────────────────

export function getAllFeatures(): WatershedFeature[] {
  return data.features;
}

export function getFeaturesByState(stateCode: string): WatershedFeature[] {
  return data.features.filter((f) => f.properties.state === stateCode);
}

export function getFeaturesByHuc6(huc6Code: string): WatershedFeature[] {
  return data.features.filter((f) => f.properties.huc6_code === huc6Code);
}

export function getFeaturesByBasin(huc8Code: string): WatershedFeature[] {
  return data.features.filter((f) => f.properties.huc8_code === huc8Code);
}

// ── Watershed accessors ───────────────────────────────────────────────────────

export function featureToWatershed(f: WatershedFeature): Watershed {
  return {
    huc12: f.properties.huc12,
    name: f.properties.name,
    state: f.properties.state,
    huc6Code: f.properties.huc6_code,
    huc6Name: f.properties.huc6_name,
    huc8Code: f.properties.huc8_code,
    huc8Name: f.properties.huc8_name,
    labelLat: f.properties.label_lat,
    labelLng: f.properties.label_lng,
  };
}

export function getAllWatersheds(): Watershed[] {
  return data.features.map(featureToWatershed);
}

export function getWatershedsByState(stateCode: string): Watershed[] {
  return getFeaturesByState(stateCode).map(featureToWatershed);
}

export function getWatershedsByHuc6(huc6Code: string): Watershed[] {
  return getFeaturesByHuc6(huc6Code).map(featureToWatershed);
}

export function getWatershedsByBasin(huc8Code: string): Watershed[] {
  return getFeaturesByBasin(huc8Code).map(featureToWatershed);
}

// ── Basin / region list builders (derived from actual data) ───────────────────

export interface RegionItem {
  code: string;
  name: string;
  color: string;
  count: number;
}

/** All HUC-6 basins present in the dataset, with counts. */
export function getAllHuc6Basins(): RegionItem[] {
  const map = new Map<string, { name: string; count: number }>();
  for (const f of data.features) {
    const { huc6_code, huc6_name } = f.properties;
    const entry = map.get(huc6_code);
    if (entry) {
      entry.count++;
    } else {
      map.set(huc6_code, { name: huc6_name, count: 1 });
    }
  }
  return [...map.entries()]
    .map(([code, { name, count }]) => ({
      code,
      name,
      color: getHuc6Color(code),
      count,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** HUC-8 basins within a given state. */
export function getHuc8BasinsForState(stateCode: string): RegionItem[] {
  const map = new Map<string, { name: string; count: number }>();
  for (const f of getFeaturesByState(stateCode)) {
    const { huc8_code, huc8_name } = f.properties;
    const entry = map.get(huc8_code);
    if (entry) {
      entry.count++;
    } else {
      map.set(huc8_code, { name: huc8_name, count: 1 });
    }
  }
  return [...map.entries()]
    .map(([code, { name, count }]) => ({
      code,
      name,
      color: getBasinColor(code),
      count,
    }))
    .sort((a, b) => b.count - a.count);
}

/** HUC-8 basins within a given HUC-6. */
export function getHuc8BasinsForHuc6(huc6Code: string): RegionItem[] {
  const map = new Map<string, { name: string; count: number }>();
  for (const f of getFeaturesByHuc6(huc6Code)) {
    const { huc8_code, huc8_name } = f.properties;
    const entry = map.get(huc8_code);
    if (entry) {
      entry.count++;
    } else {
      map.set(huc8_code, { name: huc8_name, count: 1 });
    }
  }
  return [...map.entries()]
    .map(([code, { name, count }]) => ({
      code,
      name,
      color: getBasinColor(code),
      count,
    }))
    .sort((a, b) => b.count - a.count);
}

// ── Geometry helpers ──────────────────────────────────────────────────────────

export function getPolygonCoords(
  feature: WatershedFeature
): { latitude: number; longitude: number }[][] {
  if (feature.geometry.type === 'Polygon') {
    return (feature.geometry.coordinates as number[][][]).map((ring) =>
      ring.map(([lng, lat]) => ({ latitude: lat, longitude: lng }))
    );
  } else {
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

// ── Name matching ─────────────────────────────────────────────────────────────

export function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function matchesName(input: string, watershedName: string): boolean {
  const normalizedInput = normalizeName(input);
  const normalizedName = normalizeName(watershedName);

  if (normalizedInput === normalizedName) return true;

  const withoutSuffix = normalizedName
    .replace(/(river|brook|creek|pond|lake|reservoir)$/, '');
  if (normalizedInput === withoutSuffix && withoutSuffix.length >= 4) return true;

  return false;
}
