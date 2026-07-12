// scripts/fill-transit-test.cjs

const { GoogleGenerativeAI } = require('@google/generative-ai')
const admin = require('firebase-admin')
const fs = require('fs')

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
const model = genai.getGenerativeModel({ model: 'gemini-2.5-flash' })

admin.initializeApp({
  credential: admin.credential.cert(
    require('/home/worapun_ld/plzgo-bf50c-firebase-adminsdk-fbsvc-8f1d2c976b.json')
  )
})
const db = admin.firestore()

async function getTransitInfo(place) {
  const prompt = `You are a Bangkok local expert. Give accurate transit directions to this place.

Place: ${place.name_en || place.name}
Thai name: ${place.name}
Zone: ${place.zone}
Location: ${place.location.latitude}, ${place.location.longitude}
Type: ${place.type}

Return JSON only, no markdown, no code blocks, no explanation:
{
  "bts": "e.g. BTS Siam (Exit 1) 5 min walk" or null,
  "mrt": "e.g. MRT Silom (Exit 2) 8 min walk" or null,
  "boat": "e.g. Tha Chang Pier (N9) 3 min walk" or null,
  "bus": ["15", "47"] or [],
  "nearest_transit": "shortest name of nearest transit stop",
  "walk_from_transit": "step by step from nearest transit, 1-2 sentences",
  "parking": "parking info" or null
}`

  const result = await model.generateContent(prompt)
  const raw = result.response.text().trim()
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim()

  return JSON.parse(raw)
}

async function test() {
  const snap = await db.collection('places').limit(30).get()
  const places = snap.docs.map(d => ({ id: d.id, ...d.data() }))

  const picked = []
  const seen = new Set()
  for (const p of places) {
    if (!seen.has(p.zone) && picked.length < 5) {
      picked.push(p)
      seen.add(p.zone)
    }
  }

  const results = []

  for (const place of picked) {
    console.log(`\nProcessing: ${place.name_en || place.name} (${place.zone})`)
    try {
      const transit = await getTransitInfo(place)
      results.push({ id: place.id, name: place.name_en || place.name, zone: place.zone, transit })
      console.log(JSON.stringify(transit, null, 2))
    } catch (e) {
      console.log(`Error: ${e.message}`)
      results.push({ id: place.id, name: place.name_en || place.name, zone: place.zone, error: e.message })
    }

    await new Promise(r => setTimeout(r, 500))
  }

  fs.writeFileSync('./scripts/transit-preview.json', JSON.stringify(results, null, 2))
  console.log('\nSaved to scripts/transit-preview.json')
  console.log('Review then run batch script for all 200 places')
  process.exit(0)
}

test()
