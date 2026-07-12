/**
 * enrich-places.js
 * Fills in google_place_id (and optionally lat/lng, address) for records
 * that are missing them, using Google Places Text Search API.
 *
 * Prerequisites:
 *   1. Set GOOGLE_PLACES_API_KEY environment variable (or fill below)
 *   2. npm install node-fetch (if not present)
 *
 * Usage:
 *   node scripts/enrich-places.js
 *   node scripts/enrich-places.js --dry-run     # preview only, no file write
 *   node scripts/enrich-places.js --limit 50    # process first 50 missing records
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const CSV_PATH = resolve(__dirname, '../plzgo-db-task/Plzgo_MasterDB_Clean.csv');

const API_KEY = process.env.GOOGLE_PLACES_API_KEY || '';
const DRY_RUN = process.argv.includes('--dry-run');
const LIMIT_ARG = process.argv.indexOf('--limit');
const LIMIT = LIMIT_ARG > -1 ? parseInt(process.argv[LIMIT_ARG + 1], 10) : Infinity;

const DELAY_MS = 200; // stay well under 10 req/s quota
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── CSV parsing ────────────────────────────────────────────────────────────────

function parseCSV(text) {
  const lines = text.split(/\r?\n/);
  const headers = lines[0].split(',').map(h => h.trim().replace(/^﻿/, ''));
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = [];
    let cur = '', inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; }
      else if (ch === ',' && !inQ) { values.push(cur); cur = ''; }
      else cur += ch;
    }
    values.push(cur);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (values[i] ?? '').trim(); });
    rows.push(obj);
  }
  return { headers, rows };
}

function serializeCSV(headers, rows) {
  const escape = v => {
    if (v == null) return '';
    const s = String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map(h => escape(row[h] ?? '')).join(','));
  }
  return lines.join('\n');
}

// ── Google Places Text Search ──────────────────────────────────────────────────

async function findPlace(nameEn, zoneEn, lat, lng) {
  const query = `${nameEn} ${zoneEn} Bangkok`;
  const url = new URL('https://maps.googleapis.com/maps/api/place/findplacefromtext/json');
  url.searchParams.set('input', query);
  url.searchParams.set('inputtype', 'textquery');
  url.searchParams.set('fields', 'place_id,geometry,formatted_address,name');
  // Bias results toward Bangkok
  if (lat && lng) {
    url.searchParams.set('locationbias', `circle:5000@${lat},${lng}`);
  } else {
    url.searchParams.set('locationbias', 'circle:30000@13.7563,100.5018');
  }
  url.searchParams.set('key', API_KEY);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json();

  if (data.status !== 'OK' || !data.candidates?.length) return null;
  const c = data.candidates[0];
  return {
    place_id:  c.place_id,
    lat:       c.geometry?.location?.lat ?? null,
    lng:       c.geometry?.location?.lng ?? null,
    address:   c.formatted_address ?? '',
    api_name:  c.name ?? '',
  };
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function run() {
  if (!API_KEY) {
    console.error('❌  GOOGLE_PLACES_API_KEY is not set.');
    console.error('    Export it before running: export GOOGLE_PLACES_API_KEY=your_key');
    process.exit(1);
  }

  if (!existsSync(CSV_PATH)) {
    console.error(`❌  CSV not found: ${CSV_PATH}`);
    process.exit(1);
  }

  const text = readFileSync(CSV_PATH, 'utf8');
  const { headers, rows } = parseCSV(text);

  // Find records missing google_place_id
  const targets = rows
    .filter(r => !r.google_place_id?.trim())
    .slice(0, LIMIT);

  console.log(`📋  ${targets.length} records need google_place_id enrichment`);
  if (DRY_RUN) console.log('🔍  DRY RUN — no file will be written\n');

  let enriched = 0, failed = 0;
  const rowIndex = Object.fromEntries(rows.map((r, i) => [r.plzgo_id, i]));

  for (let i = 0; i < targets.length; i++) {
    const row = targets[i];
    process.stdout.write(`[${i + 1}/${targets.length}] ${row.name_en?.slice(0, 45).padEnd(45)} `);

    try {
      const result = await findPlace(row.name_en, row.zone_en, row.latitude, row.longitude);
      if (!result) {
        process.stdout.write('⚠️  no result\n');
        failed++;
      } else {
        process.stdout.write(`✅  ${result.place_id}\n`);
        const idx = rowIndex[row.plzgo_id];
        rows[idx].google_place_id = result.place_id;

        // Fill lat/lng if missing
        if (!rows[idx].latitude && result.lat) rows[idx].latitude  = String(result.lat);
        if (!rows[idx].longitude && result.lng) rows[idx].longitude = String(result.lng);

        // Fill address_en if missing
        if (!rows[idx].address_en && result.address) rows[idx].address_en = result.address;

        // Build Google Maps URL if missing
        if (!rows[idx].google_maps_url && result.place_id) {
          rows[idx].google_maps_url =
            `https://www.google.com/maps/search/?api=1&query=${rows[idx].latitude},${rows[idx].longitude}&query_place_id=${result.place_id}`;
        }

        enriched++;
      }
    } catch (err) {
      process.stdout.write(`❌  ${err.message}\n`);
      failed++;
    }

    await sleep(DELAY_MS);
  }

  console.log(`\n✅  Enriched: ${enriched}  |  Failed/missing: ${failed}`);

  if (!DRY_RUN && enriched > 0) {
    writeFileSync(CSV_PATH, serializeCSV(headers, rows), 'utf8');
    console.log(`💾  Saved to ${CSV_PATH}`);
  }
}

run().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
