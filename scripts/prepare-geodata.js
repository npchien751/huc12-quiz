/**
 * Prepare New England HUC-12 GeoJSON data for the quiz app.
 *
 * Steps:
 * 1. Read raw GeoJSON from USGS Watershed Boundary Dataset (WBD)
 * 2. Filter to features touching New England states
 * 3. Simplify geometries (reduce vertex count)
 * 4. Add HUC-6, HUC-8, state info and label points
 * 5. Write final GeoJSON to src/data/ne_huc12.json
 *
 * Data source:
 *   Download HUC-12 GeoJSON for WBD Region 01 (New England) from USGS TNM:
 *   https://www.usgs.gov/national-hydrography/access-national-hydrography-products
 *   Or use the TNM Download API for HUC2 region 01 (and region 02 for southern CT).
 *   Save the raw file as: scripts/raw_ne_huc12.geojson
 *
 *   The WBD HUC-12 layer includes a `states` field (e.g. "CT,MA,VT") listing
 *   all states a subwatershed touches.
 */
const fs = require('fs');
const path = require('path');

const NE_STATES = ['CT', 'MA', 'RI', 'VT', 'NH', 'ME'];

// HUC-6 (Accounting Unit) name lookup for New England + adjacent
const HUC6_NAMES = {
  '010100': 'St. John',
  '010200': 'Penobscot',
  '010300': 'Kennebec',
  '010400': 'Androscoggin',
  '010500': 'Saco',
  '010600': 'Connecticut',
  '010700': 'Southern New England',
  '010800': 'Lower Connecticut',
  '010900': 'Blackstone-Narragansett',
  '011000': 'Housatonic-Thames',
  '011001': 'Rhode Island',
  '010801': 'Lake Champlain',
  '010802': 'Lower Connecticut',
  '020200': 'Upper Delaware',
  '020301': 'Upper Hudson',
  '020302': 'Long Island Sound',
};

// HUC-8 basin name lookup — includes all CT basins plus common NE ones.
// Unknown codes will fall back to the HUC-6 name.
const HUC8_NAMES = {
  // Connecticut (existing)
  '01080205': 'Lower Connecticut',
  '01080206': 'Lower Connecticut',
  '01080207': 'Farmington',
  '01090005': 'Pawcatuck-Wood',
  '01100001': 'Quinebaug',
  '01100002': 'Shetucket',
  '01100003': 'Thames',
  '01100004': 'Quinnipiac',
  '01100005': 'Housatonic',
  '01100006': 'Saugatuck',
  '01100007': 'Pawcatuck-Wood',
  '02030203': 'Long Island Sound',
  '02030101': 'Croton',
  '02030102': 'Croton',
  // Maine
  '01010001': 'Upper St. John',
  '01010002': 'Allagash',
  '01010003': 'Aroostook',
  '01010004': 'Meduxnekeag',
  '01010005': 'Lower St. John',
  '01010006': 'Big Black',
  '01010007': 'Fish-Machias',
  '01010008': 'Narraguagus-Sheepscot',
  '01010009': 'Penobscot Bay',
  '01010010': 'St. Croix',
  '01010011': 'Cobscook Bay',
  '01020001': 'Upper Penobscot',
  '01020002': 'West Branch Penobscot',
  '01020003': 'East Branch Penobscot',
  '01020004': 'Lower Penobscot',
  '01020005': 'Piscataquis',
  '01030001': 'Upper Kennebec',
  '01030002': 'Dead',
  '01030003': 'Lower Kennebec',
  '01040001': 'Upper Androscoggin',
  '01040002': 'Lower Androscoggin',
  '01050001': 'Upper Saco',
  '01050002': 'Lower Saco',
  '01050003': 'Presumpscot',
  '01050004': 'Royal-Cousins',
  // New Hampshire / Vermont
  '01060001': 'Upper Connecticut',
  '01060002': 'Millers',
  '01060003': 'Deerfield',
  '01060004': 'Westfield',
  '01060005': 'Lower Connecticut',
  '01070001': 'Merrimack',
  '01070002': 'Concord',
  '01070003': 'Nashua',
  '01070004': 'Souhegan-Blackwater',
  '01070005': 'Upper Merrimack',
  '01070006': 'Pemigewasset',
  '01070007': 'Winnipesaukee',
  '01080101': 'Winooski',
  '01080102': 'Lamoille',
  '01080103': 'Missisquoi',
  '01080104': 'Lake Champlain',
  '01080101': 'Winooski',
  '01080102': 'Lamoille',
  '01080103': 'Missisquoi',
  '01080104': 'Lake Champlain Direct',
  '01080105': 'Richelieu',
  '01080106': 'Pike-Salmon',
  '01080107': 'South Lake Champlain',
  '01080201': 'Ottauquechee-Black',
  '01080202': 'West-Williams',
  '01080203': 'Waits-Wells',
  '01080204': 'Ompompanoosuc-Stevens',
  // Massachusetts / Rhode Island
  '01090001': 'Chicopee',
  '01090002': 'Westfield',
  '01090003': 'Quaboag',
  '01090004': 'Mumford-Whitins',
  '01090006': 'Wood-Pawcatuck',
  '01100008': 'Cape Cod',
  '01100009': 'South Coastal',
  // Add more as needed from the WBD data
};

// Primary state assignment preference order (most specific NE state first)
function primaryState(statesStr) {
  if (!statesStr) return 'unknown';
  const states = statesStr.split(',').map(s => s.trim());
  // Prefer the first NE state found in the list
  for (const s of states) {
    if (NE_STATES.includes(s)) return s;
  }
  return states[0] || 'unknown';
}

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

// Main
const rawPath = path.join(__dirname, 'raw_ne_huc12.geojson');
const outPath = path.join(__dirname, '..', 'src', 'data', 'ne_huc12.json');

console.log('Reading raw GeoJSON...');
const raw = JSON.parse(fs.readFileSync(rawPath, 'utf8'));
console.log(`  Total features in raw file: ${raw.features.length}`);

// Filter to features that include at least one NE state
const neFeatures = raw.features.filter(f => {
  const states = (f.properties.states || f.properties.States || '').split(',').map(s => s.trim());
  return states.some(s => NE_STATES.includes(s));
});
console.log(`  Features touching NE states: ${neFeatures.length}`);

// Count initial vertices
let totalVertsBefore = 0;
for (const f of neFeatures) totalVertsBefore += countVertices(f.geometry);
console.log(`  Total vertices before simplification: ${totalVertsBefore}`);

// Tolerance in degrees (~0.0003 degrees ≈ 30m, good for phone screens)
const TOLERANCE = 0.0003;

const features = [];
const unknownHuc8 = new Set();
const unknownHuc6 = new Set();

for (const feature of neFeatures) {
  const props = feature.properties;
  // WBD field names vary — handle both cases
  const huc12 = props.huc12 || props.HUC12;
  const name = props.name || props.Name || props.NAME;
  const statesStr = props.states || props.States || props.STATES || '';

  const huc8Code = huc12.substring(0, 8);
  const huc6Code = huc12.substring(0, 6);

  const huc8Name = HUC8_NAMES[huc8Code] || (() => {
    unknownHuc8.add(huc8Code);
    return HUC6_NAMES[huc6Code] || huc8Code;
  })();

  const huc6Name = HUC6_NAMES[huc6Code] || (() => {
    unknownHuc6.add(huc6Code);
    return huc6Code;
  })();

  const state = primaryState(statesStr);

  // Simplify geometry
  const simplified = simplifyGeometry(feature.geometry, TOLERANCE);

  // Compute label point
  const centroid = computeCentroid(simplified);

  // Round coordinates to 5 decimal places (~1m precision)
  const roundedGeom = roundGeometry(simplified, 5);

  features.push({
    type: 'Feature',
    properties: {
      huc12,
      name,
      state,
      huc6_code: huc6Code,
      huc6_name: huc6Name,
      huc8_code: huc8Code,
      huc8_name: huc8Name,
      label_lat: Math.round(centroid.lat * 100000) / 100000,
      label_lng: Math.round(centroid.lng * 100000) / 100000,
    },
    geometry: roundedGeom,
  });
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

// Per-state counts
const stateCounts = {};
for (const f of features) {
  const s = f.properties.state;
  stateCounts[s] = (stateCounts[s] || 0) + 1;
}
console.log(`\nPer-state counts:`);
for (const [state, count] of Object.entries(stateCounts).sort()) {
  console.log(`  ${state}: ${count}`);
}

// Per-HUC6 counts
const huc6Counts = {};
for (const f of features) {
  const key = `${f.properties.huc6_code} (${f.properties.huc6_name})`;
  huc6Counts[key] = (huc6Counts[key] || 0) + 1;
}
console.log(`\nPer-HUC6 counts:`);
for (const [name, count] of Object.entries(huc6Counts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${name}: ${count}`);
}

if (unknownHuc8.size > 0) {
  console.log(`\nUnknown HUC-8 codes (fell back to HUC-6 name):`);
  for (const code of [...unknownHuc8].sort()) {
    console.log(`  ${code}`);
  }
}
if (unknownHuc6.size > 0) {
  console.log(`\nUnknown HUC-6 codes (fell back to code as name):`);
  for (const code of [...unknownHuc6].sort()) {
    console.log(`  ${code}`);
  }
}
