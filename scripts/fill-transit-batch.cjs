// scripts/fill-transit-batch.cjs
// Batch fill transit data for all places
// Resume-safe: skips places that already have transit data
// Cost-optimized: batches 5 places per API call (~80% fewer calls)

const { GoogleGenerativeAI } = require('@google/generative-ai')
const admin = require('firebase-admin')
const fs = require('fs')

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
const model = genai.getGenerativeModel({ model: 'gemini-2.5-flash' })

// Set GOOGLE_APPLICATION_CREDENTIALS env var to the path of your service account JSON key
admin.initializeApp({
  credential: admin.credential.applicationDefault()
})
const db = admin.firestore()

const CHECKPOINT = './scripts/transit-checkpoint.json'
const BATCH_SIZE = 5

function loadCheckpoint() {
  if (fs.existsSync(CHECKPOINT)) {
    return new Set(JSON.parse(fs.readFileSync(CHECKPOINT, 'utf8')))
  }
  return new Set()
}

function saveCheckpoint(done) {
  fs.writeFileSync(CHECKPOINT, JSON.stringify([...done]))
}

async function getTransitBatch(places) {
  const list = places.map((p, i) =>
    `${i + 1}. id:${p.id} | ${p.name_en || p.name} (${p.name}) | zone:${p.zone} | lat:${p.location.latitude} lng:${p.location.longitude} | type:${p.type}`
  ).join('\n')

  const prompt = `You are a Bangkok local expert. Return transit directions for each place below.

${list}

Return a JSON array (one object per place, same order), no markdown, no code blocks:
[
  {
    "id": "<place id>",
    "bts": "BTS Station (Exit N) X min walk" or null,
    "mrt": "MRT Station (Exit N) X min walk" or null,
    "boat": "Pier Name (code) X min walk" or null,
    "bus": ["15","47"] or [],
    "nearest_transit": "shortest name of nearest stop",
    "walk_from_transit": "1-2 sentences from nearest transit",
    "parking": "parking info" or null
  }
]`

  const result = await model.generateContent(prompt)
  const raw = result.response.text().trim()
    .replace(/```json/g, '').replace(/```/g, '').trim()
  return JSON.parse(raw)
}

async function run() {
  const done = loadCheckpoint()
  console.log(`Checkpoint: ${done.size} already done\n`)

  const snap = await db.collection('places').get()
  const all = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  const toProcess = all.filter(p => !done.has(p.id) && !p.transit)

  console.log(`Total: ${all.length} | To process: ${toProcess.length} | API calls: ~${Math.ceil(toProcess.length / BATCH_SIZE)}\n`)

  let success = 0
  let failed = 0
  const errors = []

  for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
    const batch = toProcess.slice(i, i + BATCH_SIZE)
    const names = batch.map(p => p.name_en || p.name).join(', ')
    console.log(`\nBatch ${Math.floor(i / BATCH_SIZE) + 1}: ${names}`)

    try {
      const results = await getTransitBatch(batch)

      const writes = db.batch()
      for (const item of results) {
        const place = batch.find(p => p.id === item.id)
        if (!place) continue
        const { id, ...transit } = item
        writes.update(db.collection('places').doc(place.id), { transit })
        done.add(place.id)
        success++
        console.log(`  ✅ ${place.name_en || place.name}`)
      }
      await writes.commit()
      saveCheckpoint(done)

    } catch (e) {
      failed += batch.length
      for (const p of batch) {
        const name = p.name_en || p.name
        errors.push({ id: p.id, name, error: e.message })
        console.log(`  ❌ ${name} — ${e.message}`)
      }
    }

    // 2s ระหว่าง batch (ปลอดภัย + rate limit)
    if (i + BATCH_SIZE < toProcess.length) {
      await new Promise(r => setTimeout(r, 2000))
    }
  }

  if (errors.length) {
    fs.writeFileSync('./scripts/transit-errors.json', JSON.stringify(errors, null, 2))
  }

  console.log(`\n─────────────────────`)
  console.log(`✅ Success: ${success}`)
  console.log(`❌ Failed:  ${failed}`)
  if (failed) console.log(`Error log: scripts/transit-errors.json`)
  console.log(`─────────────────────`)
  process.exit(0)
}

run()
