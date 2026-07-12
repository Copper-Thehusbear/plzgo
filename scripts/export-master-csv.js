#!/usr/bin/env node
/**
 * Exports Firestore `places` → plzgo-db-task/Plzgo_MasterDB_Clean.csv
 *
 * The original master CSV was lost from disk (never committed). Since the live
 * Firestore data is now the most complete copy (insights, transit, photo URLs),
 * Firestore is the source of truth and this script regenerates the master CSV
 * from it. Re-run after any bulk Firestore edit to keep the CSV in sync.
 *
 * Serialization rules:
 *   - arrays (vibe_tags, photos, images, tags…) → JSON string in one cell
 *   - objects (location, opening_hours if map) → JSON string
 *   - Firestore Timestamps → ISO 8601
 *   - doc id → column `doc_id` (first column)
 */
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { readFileSync, writeFileSync } from 'fs'

const sa = JSON.parse(readFileSync('./plzgo-db-task/service-account.json', 'utf8'))
initializeApp({ credential: cert(sa) })
const db = getFirestore()
// gRPC hangs in some sandboxes; REST transport is reliable everywhere
db.settings({ preferRest: true })

function toCell(v) {
  if (v === null || v === undefined) return ''
  if (typeof v === 'object') {
    if (typeof v.toDate === 'function') return v.toDate().toISOString()
    if (v.latitude !== undefined && v.longitude !== undefined)
      return JSON.stringify({ latitude: v.latitude, longitude: v.longitude })
    return JSON.stringify(v)
  }
  return String(v)
}

function csvEscape(s) {
  if (/[",\n\r]/.test(s)) return '"' + s.replaceAll('"', '""') + '"'
  return s
}

async function main() {
  // Paginate — a single full-collection get() stalls on this connection.
  const rows = []
  const cols = new Set(['doc_id'])
  const { FieldPath } = await import('firebase-admin/firestore')
  let last = null
  for (;;) {
    let q = db.collection('places').orderBy(FieldPath.documentId()).limit(100)
    if (last) q = q.startAfter(last)
    const snap = await q.get()
    if (snap.empty) break
    snap.forEach(d => {
      const data = d.data()
      Object.keys(data).forEach(k => cols.add(k))
      rows.push({ doc_id: d.id, ...data })
    })
    last = snap.docs[snap.docs.length - 1]
    console.log(`fetched ${rows.length}…`)
    if (snap.size < 100) break
  }

  // Stable, human-friendly column order: identity → text → geo → the rest alphabetical
  const preferred = ['doc_id', 'plzgo_id', 'name', 'name_en', 'name_th', 'type', 'category',
    'city', 'zone', 'zone_en', 'zone_th', 'insight_en', 'insight_th',
    'nearest_transit', 'nearest_transit_en', 'nearest_transit_th', 'transit_note_en', 'transit_note_th',
    'latitude', 'longitude', 'location', 'vibe_tags', 'time_tag', 'is_universal']
  const rest = [...cols].filter(c => !preferred.includes(c)).sort()
  const header = [...preferred.filter(c => cols.has(c)), ...rest]

  const lines = [header.map(csvEscape).join(',')]
  for (const r of rows) {
    lines.push(header.map(c => csvEscape(toCell(r[c]))).join(','))
  }
  const out = './plzgo-db-task/Plzgo_MasterDB_Clean.csv'
  writeFileSync(out, '﻿' + lines.join('\n'), 'utf8')
  console.log(`Wrote ${out}: ${rows.length} rows × ${header.length} columns`)
  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
