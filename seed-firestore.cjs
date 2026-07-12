#!/usr/bin/env node
/**
 * Seeds Firestore via REST API using gcloud owner credentials.
 * Run: node seed-firestore.js
 * Requires: gcloud CLI authenticated as project owner
 */

const { execSync } = require('child_process')
const https = require('https')

const PROJECT_ID = 'plzgo-bf50c'

const { places } = require('./seed.js')

function toFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null }
  if (typeof val === 'string') return { stringValue: val }
  if (typeof val === 'boolean') return { booleanValue: val }
  if (typeof val === 'number') return { doubleValue: val }
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreValue) } }
  }
  if (typeof val === 'object') {
    return {
      mapValue: {
        fields: Object.fromEntries(
          Object.entries(val).map(([k, v]) => [k, toFirestoreValue(v)])
        )
      }
    }
  }
  return { nullValue: null }
}

function postDocument(token, fields) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ fields })
    const options = {
      hostname: 'firestore.googleapis.com',
      path: `/v1/projects/${PROJECT_ID}/databases/(default)/documents/places`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }
    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          resolve(JSON.parse(data))
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`))
        }
      })
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

async function seed() {
  let token
  try {
    token = execSync('gcloud auth print-access-token', { stdio: ['pipe', 'pipe', 'pipe'] })
      .toString()
      .trim()
  } catch (e) {
    console.error('❌ Could not get gcloud access token. Run: gcloud auth login')
    process.exit(1)
  }

  console.log(`\n🌱 Seeding ${places.length} places → Firestore (${PROJECT_ID})\n`)

  let ok = 0
  let fail = 0

  for (const place of places) {
    const fields = Object.fromEntries(
      Object.entries(place).map(([k, v]) => [k, toFirestoreValue(v)])
    )
    try {
      await postDocument(token, fields)
      console.log(`  ✅  ${place.city.padEnd(12)} ${place.name}`)
      ok++
    } catch (e) {
      console.error(`  ❌  ${place.city.padEnd(12)} ${place.name}  →  ${e.message}`)
      fail++
    }
  }

  console.log(`\n${ok} seeded, ${fail} failed.\n`)
}

seed()
