#!/usr/bin/env node
/**
 * Seeds Firestore with seed-bangkok-final.json using firebase-admin.
 * Run: GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json node scripts/seed.js
 *
 * Skips documents that already exist (by name_en).
 * Use --force to overwrite all.
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const FORCE = process.argv.includes('--force')

initializeApp({ credential: cert(process.env.GOOGLE_APPLICATION_CREDENTIALS) })
const db = getFirestore()

const places = JSON.parse(
  readFileSync(resolve(__dirname, '../../seed-bangkok-final.json'), 'utf8')
)

async function run() {
  console.log(`Seeding ${places.length} places to Firestore...\n`)

  // Check existing docs
  const existing = new Set()
  if (!FORCE) {
    const snap = await db.collection('places').where('city', '==', 'Bangkok').get()
    snap.docs.forEach(d => existing.add(d.data().name_en || d.data().name))
    console.log(`Found ${existing.size} existing places — skipping them (use --force to overwrite)\n`)
  }

  let added = 0
  let skipped = 0
  let failed = 0

  // Firestore batch write (max 500 per batch)
  const BATCH_SIZE = 499
  let batch = db.batch()
  let batchCount = 0

  for (const place of places) {
    const key = place.name_en || place.name

    if (existing.has(key)) {
      skipped++
      continue
    }

    const ref = db.collection('places').doc()
    batch.set(ref, {
      ...place,
      images: place.images ?? [],
      image_url: place.image_url ?? '',
      createdAt: new Date(),
    })
    batchCount++
    added++

    if (batchCount >= BATCH_SIZE) {
      await batch.commit()
      process.stdout.write(`  committed batch of ${batchCount}...\n`)
      batch = db.batch()
      batchCount = 0
    }
  }

  if (batchCount > 0) {
    await batch.commit()
    process.stdout.write(`  committed batch of ${batchCount}...\n`)
  }

  console.log(`\n── Summary ──────────────────────`)
  console.log(`Added   : ${added}`)
  console.log(`Skipped : ${skipped}`)
  console.log(`Failed  : ${failed}`)
  console.log(`─────────────────────────────────`)
}

run().catch(e => {
  console.error(e)
  process.exit(1)
})
