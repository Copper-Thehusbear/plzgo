#!/usr/bin/env node
/**
 * Seeds Firestore `hotels` collection from bangkok_hotels_filtered.csv (Agoda partner feed).
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node scripts/seed-hotels.js
 *   add --force to overwrite all existing hotels
 *   add --dry to parse + filter only, no writes
 *
 * Doc shape (matches BaseCampCard.vue):
 *   { hotel_name, zone, star_rating, rating_average, photo1, url, latitude, longitude, rates_from, rates_currency, number_of_reviews, address }
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const FORCE = process.argv.includes('--force')
const DRY   = process.argv.includes('--dry')

const CSV_PATH = '/home/worapun_ld/bangkok_hotels_filtered.csv'

// Districts that the app's HUB_HOTEL_ZONES (ResultView.vue) maps swiped-place hubs onto.
// We only seed hotels whose address falls in one of these — keeps the collection lean and
// guarantees every result is reachable by some hub-zone query.
//
// Each canonical key has a list of accepted spelling variants (Agoda data is messy:
// "Wattana"/"Watthana", "Sathorn"/"Sathon", "Bangrak"/"Bang Rak", etc.).
const ZONE_ALIASES = {
  'Watthana':       ['Watthana', 'Wattana'],
  'Khlong Toei':    ['Khlong Toei', 'Klong Toei', 'Klongtoey', 'Khlongtoei'],
  'Bang Rak':       ['Bang Rak', 'Bangrak'],
  'Sathon':         ['Sathon', 'Sathorn'],
  'Phra Nakhon':    ['Phra Nakhon', 'Phra Nakorn', 'Phranakorn', 'Pranakorn', 'Pra Nakorn'],
  'Samphanthawong': ['Samphanthawong', 'Sampanthawong', 'Samphantawong'],
  'Chatuchak':      ['Chatuchak', 'Jatujak'],
  'Phaya Thai':     ['Phaya Thai', 'Phayathai', 'Payathai'],
  'Pathum Wan':     ['Pathum Wan', 'Pathumwan', 'Patumwan'],
  'Ratchathewi':    ['Ratchathewi', 'Rachathewi', 'Ratchatewi'],
  'Huai Khwang':    ['Huai Khwang', 'Huay Khwang', 'Huaykhwang'],
  'Bang Kho Laem':  ['Bang Kho Laem', 'Bangkholaem'],
  'Khlong San':     ['Khlong San', 'Klong San', 'Klongsan'],
  'Din Daeng':      ['Din Daeng', 'Dindaeng'],
  'Pom Prap Sattru Phai': ['Pom Prap Sattru Phai', 'Pomprap', 'Pomprab', 'Pom Prap'],
  'Dusit':          ['Dusit'],
  'Bang Sue':       ['Bang Sue', 'Bangsue'],
  'Pratunam':       ['Pratunam'],  // technically a sub-area of Ratchathewi but addresses use it
}

// Reverse map: lowercased alias → canonical zone name.
const ALIAS_TO_CANONICAL = new Map()
for (const [canon, aliases] of Object.entries(ZONE_ALIASES)) {
  for (const a of aliases) ALIAS_TO_CANONICAL.set(a.toLowerCase(), canon)
}

const PER_ZONE_LIMIT = 25  // keep top N per zone — page already only shows 3

// --- CSV parsing ----------------------------------------------------------
// Minimal RFC4180-ish parser: handles quoted fields, escaped "" inside quotes, commas in quotes.
function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ }
        else { inQuotes = false }
      } else {
        field += c
      }
    } else {
      if (c === '"') inQuotes = true
      else if (c === ',') { row.push(field); field = '' }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
      else if (c === '\r') { /* skip */ }
      else field += c
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row) }
  return rows
}

// Extract canonical Bangkok district name from a freeform addressline1.
// Strategy:
//   1) split on commas, check each part against alias list (handles "Wattana", "Sathorn", etc.)
//   2) fall back to word-level substring scan on the whole address (handles "Soi 5 Sukhumvit Rd., Wattana"
//      where the district sits at the end without a delimiter we can rely on).
// Order matters: more-specific aliases (e.g., "Khlong Toei") must be checked before short ones.
function extractZone(address) {
  if (!address) return null
  const lower = address.toLowerCase()
  const parts = lower.split(/[,.]/).map(s => s.trim()).filter(Boolean)

  for (const p of parts) {
    if (ALIAS_TO_CANONICAL.has(p)) return ALIAS_TO_CANONICAL.get(p)
    for (const [alias, canon] of ALIAS_TO_CANONICAL) {
      if (p === alias || p.startsWith(alias + ' ') || p.endsWith(' ' + alias)) return canon
    }
  }
  // Whole-string fallback — longest aliases first to avoid partial collisions.
  const aliasesByLen = [...ALIAS_TO_CANONICAL.keys()].sort((a, b) => b.length - a.length)
  for (const alias of aliasesByLen) {
    // Word-boundary-ish: require non-alpha char (or start/end) on both sides.
    const re = new RegExp(`(^|[^a-z])${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`)
    if (re.test(lower)) return ALIAS_TO_CANONICAL.get(alias)
  }
  return null
}

function buildHotelDoc(row, header) {
  const get = k => row[header.indexOf(k)]
  const num = v => {
    const n = parseFloat(v)
    return Number.isFinite(n) ? n : null
  }
  const intNum = v => {
    const n = parseInt(v, 10)
    return Number.isFinite(n) ? n : null
  }

  const address = get('addressline1')
  const zone = extractZone(address)
  if (!zone) return null

  const lat = num(get('latitude'))
  const lng = num(get('longitude'))
  if (lat == null || lng == null) return null

  const httpsify = u => (u || '').trim().replace(/^http:\/\//i, 'https://')
  const photo1 = httpsify(get('photo1'))
  if (!photo1) return null

  const ratingAvg  = num(get('rating_average'))
  const starRating = intNum(get('star_rating'))
  // Quality filter: skip obvious low-quality entries.
  if (ratingAvg != null && ratingAvg < 6.5) return null
  if (starRating != null && starRating < 3) return null

  return {
    hotel_id:          intNum(get('hotel_id')),
    hotel_name:        (get('hotel_name') || '').trim(),
    zone,
    address:           address.trim(),
    star_rating:       starRating,
    rating_average:    ratingAvg,
    number_of_reviews: intNum(get('number_of_reviews')),
    photo1,
    photo2:            httpsify(get('photo2')) || null,
    url:               (get('url') || '').trim(),
    latitude:          lat,
    longitude:         lng,
    rates_from:        num(get('rates_from')),
    rates_currency:    (get('rates_currency') || 'USD').trim(),
    accommodation_type: (get('accommodation_type') || 'Hotel').trim(),
    // Sponsorship slots — toggle via Firestore Console for paid placements.
    // is_sponsored=true && sponsor_until>now() will bubble the hotel to the top
    // of BaseCampCard, before any Agoda live-API result. See ResultView mergeHotels().
    is_sponsored:      false,
    priority_score:    0,
    sponsor_until:     null,
  }
}

// --- Main -----------------------------------------------------------------
async function main() {
  const csvText = readFileSync(CSV_PATH, 'utf8')
  const rows = parseCsv(csvText)
  const header = rows[0]
  const dataRows = rows.slice(1).filter(r => r.length >= header.length - 1 && r[0])

  console.log(`Parsed ${dataRows.length} CSV rows`)

  const byZone = new Map()
  let skippedNoZone = 0, skippedQuality = 0, skippedNoPhoto = 0, skippedNoCoord = 0

  for (const r of dataRows) {
    const doc = buildHotelDoc(r, header)
    if (!doc) {
      const addr = r[header.indexOf('addressline1')] || ''
      if (!extractZone(addr)) skippedNoZone++
      else if (!(r[header.indexOf('photo1')] || '').trim()) skippedNoPhoto++
      else if (!parseFloat(r[header.indexOf('latitude')])) skippedNoCoord++
      else skippedQuality++
      continue
    }
    if (!byZone.has(doc.zone)) byZone.set(doc.zone, [])
    byZone.get(doc.zone).push(doc)
  }

  // Sort each zone by rating, then keep top N.
  const final = []
  for (const [zone, list] of byZone) {
    list.sort((a, b) => {
      const ra = a.rating_average || 0
      const rb = b.rating_average || 0
      if (rb !== ra) return rb - ra
      return (b.number_of_reviews || 0) - (a.number_of_reviews || 0)
    })
    const kept = list.slice(0, PER_ZONE_LIMIT)
    final.push(...kept)
    console.log(`  ${zone.padEnd(20)} ${String(list.length).padStart(4)} matched → keep ${kept.length}`)
  }

  console.log(`\nFiltered: ${final.length} hotels across ${byZone.size} zones`)
  console.log(`Skipped:  ${skippedNoZone} no-zone · ${skippedNoPhoto} no-photo · ${skippedNoCoord} no-coord · ${skippedQuality} low-quality`)

  if (DRY) {
    console.log('\n--dry mode: no writes.')
    console.log('Sample doc:', JSON.stringify(final[0], null, 2))
    return
  }

  // ---- Firestore upload ----
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || resolve(__dirname, '../service-account.json')
  initializeApp({ credential: cert(credPath) })
  const db = getFirestore()

  if (FORCE) {
    console.log('\n--force: clearing existing hotels collection...')
    const snap = await db.collection('hotels').get()
    let batch = db.batch(), n = 0
    for (const d of snap.docs) {
      batch.delete(d.ref); n++
      if (n % 499 === 0) { await batch.commit(); batch = db.batch() }
    }
    if (n % 499 !== 0) await batch.commit()
    console.log(`  deleted ${n} existing docs`)
  } else {
    const snap = await db.collection('hotels').limit(1).get()
    if (!snap.empty) {
      console.log('\nhotels collection is non-empty — pass --force to overwrite. Exiting.')
      return
    }
  }

  console.log('\nWriting hotels...')
  let batch = db.batch(), batchN = 0, total = 0
  for (const doc of final) {
    const ref = db.collection('hotels').doc()
    batch.set(ref, { ...doc, createdAt: new Date() })
    batchN++; total++
    if (batchN >= 499) {
      await batch.commit()
      console.log(`  committed ${total}/${final.length}`)
      batch = db.batch(); batchN = 0
    }
  }
  if (batchN > 0) await batch.commit()
  console.log(`\nDone. ${total} hotels written.`)
}

main().catch(e => { console.error(e); process.exit(1) })
