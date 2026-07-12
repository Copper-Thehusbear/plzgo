/**
 * migrate-places.js
 * Updates all 483 new-schema places (have plzgo_id, no city) with fields the app needs.
 * Run: node scripts/migrate-places.js
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore }        from 'firebase-admin/firestore'
import { readFileSync }        from 'fs'
import { resolve, dirname }    from 'path'
import { fileURLToPath }       from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const sa = JSON.parse(readFileSync(resolve(__dirname, '../plzgo-db-task/service-account.json'), 'utf8'))
initializeApp({ credential: cert(sa) })
const db = getFirestore()

// ─── Category → type ──────────────────────────────────────────────────────────
const CATEGORY_TYPE = {
  'Food & Drink': 'food',
  'Experience':   'attraction',
  'Landmark':     'attraction',
  'Nightlife':    'nightlife',
  'Shop & Market':'market',
  'Wellness':     'wellness',
}

// ─── Category → base vibes ───────────────────────────────────────────────────
const CATEGORY_VIBES = {
  'Food & Drink': ['foodie'],
  'Experience':   ['photo', 'chill'],
  'Landmark':     ['photo'],
  'Nightlife':    ['party'],
  'Shop & Market':['chill', 'foodie'],
  'Wellness':     ['chill'],
}

// ─── Vibe keyword → tags ─────────────────────────────────────────────────────
const VIBE_MAP = {
  'Street Food':['foodie'], 'Cafe':['foodie'], 'Dessert':['foodie'],
  'Restaurant':['foodie'],  'Fine Dining':['foodie'], 'Crispy':['foodie'],
  'Artisanal':['foodie','chill'], 'Foodie':['foodie'],
  'Chill':['chill'], 'Peaceful':['chill'], 'Relaxed':['chill'],
  'Relaxing':['chill'], 'Quiet':['chill'], 'Serene':['chill'],
  'Tranquil':['chill'], 'Zen':['chill'], 'Cozy':['chill'],
  'Romantic':['chill'], 'Laid-back':['chill'], 'Rustic':['chill'],
  'Minimalist':['chill'], 'Warm':['chill'], 'Charming':['chill','photo'],
  'Homey':['chill'], 'Casual':['chill'], 'Fresh':['chill','foodie'],
  'Nature':['chill','photo'], 'Tropical':['chill','photo'], 'Lush':['chill','photo'],
  'Party':['party'], 'Wild':['party'], 'Lively':['party'],
  'Vibrant':['party'], 'Social':['party'], 'Energetic':['party'],
  'Neon':['party','photo'], 'Hip':['party'], 'Youthful':['party'],
  'Musical':['party'], 'Underground':['party'], 'Speakeasy':['party'],
  'Late Night':['party'], 'Bar':['party'], 'Cool':['party','chill'],
  'Glamorous':['party','photo'], 'Theatrical':['party','photo'],
  'Cinematic':['photo'], 'Aesthetic':['photo'], 'Iconic':['photo'],
  'Magical':['photo'], 'Panoramic':['photo'], 'Scenic':['photo'],
  'Artistic':['photo'], 'Gallery':['photo'], 'Colorful':['photo'],
  'Vintage':['photo','chill'], 'Bohemian':['photo','chill'],
  'Architectural':['photo'], 'Surreal':['photo'], 'Grand':['photo'],
  'Royal':['photo'], 'Moody':['photo'], 'Dramatic':['photo'],
  'Futuristic':['photo'], 'Retro':['photo','chill'], 'Designer':['photo'],
  'Historic':['photo','chill'], 'Cultural':['photo','chill'],
  'Heritage':['photo','chill'], 'Nostalgic':['chill','photo'],
  'Authentic':['chill','foodie'], 'Local':['chill','foodie'],
  'Trendy':['party','photo'], 'Modern':['chill','photo'],
  'Luxury':['chill','photo'], 'Sophisticated':['chill','photo'],
  'Elegant':['chill','photo'], 'Chic':['chill','photo'],
  'Stylish':['chill','photo'], 'Sleek':['chill'],
  'Industrial':['photo','chill'], 'Classic':['chill','photo'],
  'Legendary':['photo','chill'], 'Spiritual':['chill','photo'],
  'Sacred':['chill','photo'], 'Quirky':['photo','party'],
  'Playful':['party','photo'], 'Communal':['party','chill'],
  'Riverside':['photo','chill'], 'Intimate':['chill'],
  'Busy':['party','foodie'], 'Bustling':['foodie','party'],
  'Old-school':['chill','photo'], 'Soulful':['chill','photo'],
  'Analog':['chill','photo'], 'Craft':['foodie','chill'],
  'Japanese':['foodie','chill'], 'Sweet':['foodie'],
  'Organic':['chill'], 'Hidden':['chill','photo'],
  'Reliable':['chill'], 'Friendly':['chill'],
}

function buildVibeTags(doc) {
  const vibes = new Set(CATEGORY_VIBES[doc.category] || ['chill'])
  const add = key => { if (key && VIBE_MAP[key.trim()]) VIBE_MAP[key.trim()].forEach(v => vibes.add(v)) }
  add(doc.vibe_primary)
  add(doc.vibe_secondary)
  if (parseInt(doc.gay_score || 0) >= 3 || doc.is_gay_exclusive === true) vibes.add('gay-vibe')
  return [...vibes]
}

// ─── time_tag from match_time_of_day ─────────────────────────────────────────
function deriveTimeTag(matchTimeOfDay) {
  if (!matchTimeOfDay) return 'Anytime'
  const s = matchTimeOfDay.toLowerCase()
  if (s.includes('night'))     return 'Night'
  if (s.includes('evening'))   return 'Evening'
  if (s.includes('afternoon')) return 'Afternoon'
  if (s.includes('morning'))   return 'Morning'
  return 'Anytime'
}

// ─── opening_hours: extract Mon hours, convert to 24h "HH:MM–HH:MM" ─────────
function simplifyHours(raw) {
  if (!raw) return null
  const lower = raw.toLowerCase()
  if (lower.includes('24') || lower.includes('always open')) return 'Open 24hrs'

  // Try to extract first segment "X:XX – X:XX AM/PM"
  const match = raw.match(/(\d{1,2}:\d{2})\s*(AM|PM)?\s*[–-]\s*(\d{1,2}:\d{2})\s*(AM|PM)?/i)
  if (!match) return raw.split('|')[0].replace(/^[^:]+:\s*/, '').trim() || raw

  const toMins = (t, period) => {
    let [h, m] = t.split(':').map(Number)
    if (period?.toUpperCase() === 'PM' && h !== 12) h += 12
    if (period?.toUpperCase() === 'AM' && h === 12) h = 0
    return { h, m }
  }
  const pad = n => String(n).padStart(2, '0')

  const open  = toMins(match[1], match[2])
  const close = toMins(match[3], match[4])
  return `${pad(open.h)}:${pad(open.m)}–${pad(close.h)}:${pad(close.m)}`
}

// ─── price_range normalise to ฿ symbols ─────────────────────────────────────
function normalizePrice(raw) {
  if (!raw) return null
  const map = {
    'free': 'Free', 'Free': 'Free',
    '$': '฿',      'budget': '฿', 'Low': '฿', 'low': '฿',
    '$$': '฿฿',    'mid': '฿฿',
    '$$$': '฿฿฿',  'upscale': '฿฿฿',
    '$$$$': '฿฿฿฿','luxury': '฿฿฿฿',
    '$$$$$': '฿฿฿฿฿',
    '฿':'฿', '฿฿':'฿฿', '฿฿฿':'฿฿฿', '฿฿฿฿':'฿฿฿฿',
  }
  return map[raw] ?? raw
}

// ─── Main migration ──────────────────────────────────────────────────────────
async function run() {
  console.log('📖 Fetching all places...')
  const snap = await db.collection('places').get()
  const toMigrate = snap.docs.filter(d => d.data().plzgo_id && !d.data().city)
  console.log(`✅ Found ${toMigrate.length} new-schema places to migrate\n`)

  const BATCH_SIZE = 400
  let batch = db.batch()
  let count = 0, total = 0

  for (const docSnap of toMigrate) {
    const d = docSnap.data()

    const update = {
      city:               'Bangkok',
      location:           { latitude: d.latitude, longitude: d.longitude },
      name:               d.name_th || d.name_en,
      vibe_tags:          buildVibeTags(d),
      time_tag:           deriveTimeTag(d.match_time_of_day),
      description_tourist:d.insight_en || '',
      description:        d.insight_th || '',
      images:             d.photos || [],
      image_url:          d.photos?.[0] || '',
      opening_hours:      simplifyHours(d.opening_hours_en),
      duration_minutes:   d.duration_min || null,
      nearest_transit:    d.nearest_transit_en || null,
      type:               CATEGORY_TYPE[d.category] || 'attraction',
      price_range:        normalizePrice(d.price_range),
      zone:               d.zone_en || '',
    }

    batch.update(docSnap.ref, update)
    count++
    total++

    if (count >= BATCH_SIZE) {
      await batch.commit()
      console.log(`  📦 Committed batch (total: ${total})`)
      batch = db.batch()
      count = 0
    }
  }

  if (count > 0) {
    await batch.commit()
    console.log(`  📦 Final batch (total: ${total})`)
  }

  console.log(`\n✨ Migration complete! Updated ${total} places.`)
  process.exit(0)
}

run().catch(e => { console.error('❌', e); process.exit(1) })
