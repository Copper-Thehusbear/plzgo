#!/usr/bin/env node
/**
 * Applies the "Sassy Local Friend" insight rewrites (2026-07 voice pass) to
 * Firestore `places`. Input: rewritten-chunk-*.json files, each an array of
 * { doc_id, insight_en, insight_th }.
 *
 * Usage:
 *   node scripts/apply-insight-rewrites.js <dir-with-chunks>           # dry run
 *   node scripts/apply-insight-rewrites.js <dir-with-chunks> --apply   # write
 *
 * Rollback: the pre-rewrite values live in bland-chunk-*.json (same dir) and
 * in the committed master CSV.
 */
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

const dir = process.argv[2]
const apply = process.argv.includes('--apply')
if (!dir) { console.error('usage: node scripts/apply-insight-rewrites.js <dir> [--apply]'); process.exit(1) }

const sa = JSON.parse(readFileSync('./plzgo-db-task/service-account.json', 'utf8'))
initializeApp({ credential: cert(sa) })
const db = getFirestore()
// gRPC hangs in some sandboxes; REST transport is reliable everywhere
db.settings({ preferRest: true })

const items = readdirSync(dir)
  .filter(f => /^rewritten-chunk-\d+\.json$/.test(f))
  .sort()
  .flatMap(f => JSON.parse(readFileSync(join(dir, f), 'utf8')))

console.log(`loaded ${items.length} rewrites`)

const ids = new Set(items.map(i => i.doc_id))
if (ids.size !== items.length) {
  console.error(`duplicate doc_ids: ${items.length - ids.size}`)
  process.exit(1)
}

// Verify every doc exists before writing anything
const missing = []
const refs = items.map(i => db.collection('places').doc(i.doc_id))
const snaps = await db.getAll(...refs)
snaps.forEach((s, i) => { if (!s.exists) missing.push(items[i].doc_id) })
if (missing.length) {
  console.error(`missing docs (${missing.length}):`, missing.slice(0, 10))
  process.exit(1)
}
console.log('all doc_ids exist in places ✓')

if (!apply) {
  const sample = items[0]
  console.log('\nDRY RUN — nothing written. Sample:')
  console.log(sample.doc_id)
  console.log('  EN:', sample.insight_en)
  console.log('  TH:', sample.insight_th)
  console.log('\nRe-run with --apply to write.')
  process.exit(0)
}

let written = 0
for (let i = 0; i < items.length; i += 400) {
  const batch = db.batch()
  for (const item of items.slice(i, i + 400)) {
    batch.update(db.collection('places').doc(item.doc_id), {
      insight_en: item.insight_en.trim(),
      insight_th: item.insight_th.trim(),
    })
  }
  await batch.commit()
  written += Math.min(400, items.length - i)
  console.log(`committed ${written}/${items.length}`)
}
console.log('done')
