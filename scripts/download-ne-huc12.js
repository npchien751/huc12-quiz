/**
 * Download New England HUC-12 subwatersheds from the USGS WBD REST service.
 * Saves raw GeoJSON to scripts/raw_ne_huc12.geojson
 *
 * Run: node scripts/download-ne-huc12.js
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const BASE_URL = 'https://hydro.nationalmap.gov/arcgis/rest/services/wbd/MapServer/6/query';
const OUT_PATH = path.join(__dirname, 'raw_ne_huc12.geojson');

const BATCH = 200;
const FIELDS = 'huc12,name,states,areasqkm';

function fetchPage(where, offset) {
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({
      where,
      outFields: FIELDS,
      outSR: '4326',
      f: 'geojson',
      returnGeometry: 'true',
      resultOffset: String(offset),
      resultRecordCount: String(BATCH),
    });
    const url = `${BASE_URL}?${params}`;
    https.get(url, (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(raw);
          resolve(parsed);
        } catch (e) {
          reject(new Error(`JSON parse error at offset ${offset}: ${e.message}\nBody: ${raw.slice(0, 300)}`));
        }
      });
    }).on('error', reject);
  });
}

async function fetchAll(label, where) {
  console.log(`\nFetching ${label}...`);
  const features = [];
  let offset = 0;

  while (true) {
    process.stdout.write(`  offset ${offset}...`);
    const page = await fetchPage(where, offset);

    if (page.error) {
      throw new Error(`Service error: ${JSON.stringify(page.error)}`);
    }

    const batch = page.features || [];
    process.stdout.write(` ${batch.length} features\n`);
    features.push(...batch);

    if (batch.length < BATCH) break;
    offset += BATCH;
    if (offset > 20000) { console.warn('Safety cap hit'); break; }
  }

  return features;
}

async function main() {
  console.log('Downloading NE HUC-12 data from USGS WBD REST service...');

  // Region 01 = all of New England
  const region01 = await fetchAll('HUC2 Region 01 (New England)', "huc12 LIKE '01%'");

  // Region 02 features that touch NE states (CT/RI/MA coastal drainages)
  // Using single-state checks with simple LIKE on the states field
  const region02ct = await fetchAll('Region 02 touching CT', "huc12 LIKE '02%' AND states LIKE '%CT%'");
  const region02ma = await fetchAll('Region 02 touching MA', "huc12 LIKE '02%' AND states LIKE '%MA%'");
  const region02ri = await fetchAll('Region 02 touching RI', "huc12 LIKE '02%' AND states LIKE '%RI%'");

  // Merge, deduplicating by huc12 code
  const seen = new Set();
  const allFeatures = [];
  for (const f of [...region01, ...region02ct, ...region02ma, ...region02ri]) {
    const code = f.properties?.huc12;
    if (code && !seen.has(code)) {
      seen.add(code);
      allFeatures.push(f);
    }
  }

  console.log(`\nTotal unique features: ${allFeatures.length}`);

  // Per-state summary
  const stateCounts = {};
  for (const f of allFeatures) {
    const states = (f.properties?.states || '').split(',').map(s => s.trim());
    for (const s of states) {
      if (s) stateCounts[s] = (stateCounts[s] || 0) + 1;
    }
  }
  console.log('Feature counts by state tag:');
  for (const [s, n] of Object.entries(stateCounts).sort((a, b) => b[1] - a[1]).slice(0, 15)) {
    console.log(`  ${s}: ${n}`);
  }

  const geojson = { type: 'FeatureCollection', features: allFeatures };
  fs.writeFileSync(OUT_PATH, JSON.stringify(geojson));
  const mb = (fs.statSync(OUT_PATH).size / 1024 / 1024).toFixed(1);
  console.log(`\nWritten to: ${OUT_PATH} (${mb} MB)`);
}

main().catch((err) => {
  console.error('\nDownload failed:', err.message);
  process.exit(1);
});
