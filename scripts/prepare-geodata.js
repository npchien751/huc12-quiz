/**
 * Prepare CT HUC-12 GeoJSON data for the quiz app.
 *
 * Steps:
 * 1. Read raw GeoJSON from USGS
 * 2. Simplify geometries (reduce vertex count)
 * 3. Add HUC-8 basin info and label points
 * 4. Write final GeoJSON to src/data/
 */
const fs = require('fs');
const path = require('path');

// HUC-8 basin lookup
const HUC8_BASINS = {
  '01080205': 'Lower Connecticut',
  '01080207': 'Farmington',
  '01090005': 'Pawcatuck-Wood',
  '01100001': 'Quinebaug',
  '01100002': 'Shetucket',
  '01100003': 'Thames',
  '01100004': 'Quinnipiac',
  '01100005': 'Housatonic',
  '01100006': 'Saugatuck',
  '02030203': 'Long Island Sound',
  '01100007': 'Pawcatuck-Wood',
  '02030101': 'Croton',
  '02030102': 'Croton',
  '01080206': 'Lower Connecticut',
};

// Douglas-Peucker simplification
function simplifyCoords(coords, tolerance) {
  if (coords.length <= 2) return coords;

  let maxDist = 0;
  let maxIdx = 0;

  const first = coords[0];
  const last = coords[coords.length - 1];

  for (let i = 1; i < coords.length - 1; i++) {
    const dist = perpendicularDistance(coords[i], first, last);
    if (dist > maxDist) {
      maxDist = dist;
      maxIdx = i;
    }
  }

  if (maxDist > tolerance) {
    const left = simplifyCoords(coords.slice(0, maxIdx + 1), tolerance);
    const right = simplifyCoords(coords.slice(maxIdx), tolerance);
    return left.slice(0, -1).concat(right);
  } else {
    return [first, last];
  }
}

function perpendicularDistance(point, lineStart, lineEnd) {
  const dx = lineEnd[0] - lineStart[0];
  const dy = lineEnd[1] - lineStart[1];

  if (dx === 0 && dy === 0) {
    return Math.sqrt(
      (point[0] - lineStart[0]) ** 2 + (point[1] - lineStart[1]) ** 2
    );
  }

  const t = ((point[0] - lineStart[0]) * dx + (point[1] - lineStart[1]) * dy) / (dx * dx + dy * dy);
  const clampedT = Math.max(0, Math.min(1, t));

  const projX = lineStart[0] + clampedT * dx;
  const projY = lineStart[1] + clampedT * dy;

  return Math.sqrt((point[0] - projX) ** 2 + (point[1] - projY) ** 2);
}

function simplifyGeometry(geometry, tolerance) {
  if (geometry.type === 'Polygon') {
    return {
      type: 'Polygon',
      coordinates: geometry.coordinates.map(ring => simplifyCoords(ring, tolerance)),
    };
  } else if (geometry.type === 'MultiPolygon') {
    return {
      type: 'MultiPolygon',
      coordinates: geometry.coordinates.map(polygon =>
        polygon.map(ring => simplifyCoords(ring, tolerance))
      ),
    };
  }
  return geometry;
}

// Compute centroid of a polygon
function computeCentroid(geometry) {
  let coords;
  if (geometry.type === 'Polygon') {
    coords = geometry.coordinates[0]; // outer ring
  } else if (geometry.type === 'MultiPolygon') {
    // Use the largest polygon
    let maxArea = 0;
    coords = geometry.coordinates[0][0];
    for (const poly of geometry.coordinates) {
      const area = Math.abs(ringArea(poly[0]));
      if (area > maxArea) {
        maxArea = area;
        coords = poly[0];
      }
    }
  } else {
    return { lat: 0, lng: 0 };
  }

  let sumX = 0, sumY = 0, sumArea = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const x0 = coords[i][0], y0 = coords[i][1];
    const x1 = coords[i + 1][0], y1 = coords[i + 1][1];
    const cross = x0 * y1 - x1 * y0;
    sumX += (x0 + x1) * cross;
    sumY += (y0 + y1) * cross;
    sumArea += cross;
  }
  const area = sumArea / 2;
  if (Math.abs(area) < 1e-10) {
    // Fallback: simple average
    const avgX = coords.reduce((s, c) => s + c[0], 0) / coords.length;
    const avgY = coords.reduce((s, c) => s + c[1], 0) / coords.length;
    return { lat: avgY, lng: avgX };
  }
  return {
    lng: sumX / (6 * area),
    lat: sumY / (6 * area),
  };
}

function ringArea(ring) {
  let area = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    area += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  }
  return area / 2;
}

// Count total vertices in a geometry
function countVertices(geometry) {
  let count = 0;
  if (geometry.type === 'Polygon') {
    for (const ring of geometry.coordinates) count += ring.length;
  } else if (geometry.type === 'MultiPolygon') {
    for (const poly of geometry.coordinates)
      for (const ring of poly) count += ring.length;
  }
  return count;
}

// Main
const rawPath = path.join(__dirname, 'raw_ct_huc12.geojson');
const outPath = path.join(__dirname, '..', 'src', 'data', 'ct_huc12.json');

console.log('Reading raw GeoJSON...');
const raw = JSON.parse(fs.readFileSync(rawPath, 'utf8'));
console.log(`  Total features: ${raw.features.length}`);

// Count initial vertices
let totalVertsBefore = 0;
for (const f of raw.features) totalVertsBefore += countVertices(f.geometry);
console.log(`  Total vertices before simplification: ${totalVertsBefore}`);

// Tolerance in degrees (~0.0003 degrees ≈ 30m, good for phone screens)
const TOLERANCE = 0.0003;

const features = [];
for (const feature of raw.features) {
  const props = feature.properties;
  const huc12 = props.huc12;
  const name = props.name;
  const huc8Code = huc12.substring(0, 8);
  const huc8Name = HUC8_BASINS[huc8Code] || 'Unknown';

  // Simplify geometry
  const simplified = simplifyGeometry(feature.geometry, TOLERANCE);

  // Compute label point
  const centroid = computeCentroid(simplified);

  // Round coordinates to 5 decimal places (~1m precision, plenty for display)
  const roundedGeom = roundGeometry(simplified, 5);

  features.push({
    type: 'Feature',
    properties: {
      huc12,
      name,
      huc8_code: huc8Code,
      huc8_name: huc8Name,
      label_lat: Math.round(centroid.lat * 100000) / 100000,
      label_lng: Math.round(centroid.lng * 100000) / 100000,
    },
    geometry: roundedGeom,
  });
}

function roundGeometry(geometry, decimals) {
  const factor = Math.pow(10, decimals);
  const roundCoord = (c) => [
    Math.round(c[0] * factor) / factor,
    Math.round(c[1] * factor) / factor,
  ];

  if (geometry.type === 'Polygon') {
    return {
      type: 'Polygon',
      coordinates: geometry.coordinates.map(ring => ring.map(roundCoord)),
    };
  } else if (geometry.type === 'MultiPolygon') {
    return {
      type: 'MultiPolygon',
      coordinates: geometry.coordinates.map(poly =>
        poly.map(ring => ring.map(roundCoord))
      ),
    };
  }
  return geometry;
}

// Count final vertices
let totalVertsAfter = 0;
for (const f of features) totalVertsAfter += countVertices(f.geometry);

const output = {
  type: 'FeatureCollection',
  features,
};

const json = JSON.stringify(output);
fs.writeFileSync(outPath, json);

console.log(`\nResults:`);
console.log(`  Features: ${features.length}`);
console.log(`  Vertices after simplification: ${totalVertsAfter} (${Math.round(totalVertsAfter / totalVertsBefore * 100)}% of original)`);
console.log(`  File size: ${(json.length / 1024 / 1024).toFixed(2)} MB`);
console.log(`  Written to: ${outPath}`);

// Show per-basin counts
const basinCounts = {};
for (const f of features) {
  const basin = f.properties.huc8_name;
  basinCounts[basin] = (basinCounts[basin] || 0) + 1;
}
console.log(`\nPer-basin counts:`);
for (const [name, count] of Object.entries(basinCounts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${name}: ${count}`);
}
