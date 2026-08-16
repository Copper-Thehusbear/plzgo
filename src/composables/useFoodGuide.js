import { db } from '@/firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'

/**
 * Data layer for the /bangkok/food guide pages.
 *
 * Firestore stores the administrative district (Samphanthawong, Pathum Wan).
 * Nobody searches for those — they search "yaowarat street food" or "where to
 * eat in silom". So each page is keyed by the name people actually type, and
 * maps to the district(s) behind it.
 *
 * Every district appears under exactly ONE slug. Overlapping sets would put
 * the same restaurants on two pages, which reads as duplicate content and
 * costs both pages. (Note this is intentionally stricter than the overlapping
 * HUB_HOTEL_ZONES map in ResultView, which exists for a different job:
 * finding hotels near a route, where overlap is harmless.)
 */
export const FOOD_ZONES = [
  {
    slug: 'yaowarat',
    name: 'Yaowarat',
    aka: 'Chinatown',
    districts: ['Samphanthawong'],
    blurb: "Bangkok's oldest eating street, and still the loudest. Most of it only wakes up after dark — stalls take over the pavement, the neon comes on, and the queues start.",
    tip: 'Come hungry after 7pm. Bring cash, almost nothing here takes card.',
  },
  {
    slug: 'siam',
    name: 'Siam',
    aka: 'Pathum Wan',
    districts: ['Pathum Wan'],
    blurb: 'Mall food courts that are genuinely good, sitting next to campus canteens and old shophouse restaurants that were here long before the malls were.',
    tip: 'The food courts on the top floors beat the restaurants below them, for a third of the price.',
  },
  {
    slug: 'sukhumvit',
    name: 'Sukhumvit',
    aka: 'Thonglor & Ekkamai',
    districts: ['Watthana'],
    blurb: 'Where Bangkok spends its money on dinner. Japanese counters, natural wine, and the odd legendary street cart that outlasted everything built around it.',
    tip: 'Book the small places. The good ones on Thonglor fill up days ahead.',
  },
  {
    slug: 'ari',
    name: 'Ari',
    aka: 'Phaya Thai',
    districts: ['Phaya Thai'],
    blurb: 'The neighbourhood locals move to for the food. Low-rise sois full of cafés and small kitchens, all within walking distance of one BTS stop.',
    tip: 'Everything worth eating is within 10 minutes of Ari station. Walk, do not take a taxi.',
  },
  {
    slug: 'old-city',
    name: 'Old City',
    aka: 'Rattanakosin & Phra Nakhon',
    districts: ['Phra Nakhon'],
    blurb: 'Temple-district cooking: shops that have run the same single dish for generations, mostly closing early enough to catch people out.',
    tip: 'Eat lunch here, not dinner. A lot of the best places shut by 4pm.',
  },
  {
    slug: 'silom',
    name: 'Silom',
    aka: 'Bang Rak',
    districts: ['Bang Rak'],
    blurb: 'Office lunch crowds by day, street grills by night. Bang Rak has been called the district of good food for about a century, and it still holds up.',
    tip: 'Weekday lunch is the peak. Sundays are quiet — some places just close.',
  },
  {
    slug: 'sathorn',
    name: 'Sathorn',
    aka: 'Sathon',
    districts: ['Sathon'],
    blurb: 'Embassies, towers, and hotel restaurants — plus the canteens that feed the people who work in them, hidden one soi back from the main road.',
    tip: 'The expensive rooms are on the top floors. The good ones are at street level.',
  },
  {
    slug: 'riverside',
    name: 'Riverside',
    aka: 'Khlong San',
    districts: ['Khlong San'],
    blurb: 'The Thonburi bank, reachable by a two-minute ferry. Warehouse conversions and riverside kitchens, with the skyline on the other side of the water.',
    tip: 'Take the cross-river ferry instead of a taxi. It costs a few baht and skips the bridge traffic.',
  },
]

export function zoneBySlug(slug) {
  return FOOD_ZONES.find(z => z.slug === slug) || null
}

/** Firestore stores the district in either `zone_en` or `zone` depending on vintage. */
export function districtOf(place) {
  return (place.zone_en || place.zone || '').trim()
}

let foodCache = null

/**
 * All Bangkok food places. Cached for the session — the guide pages cross-link
 * heavily, and every navigation between them would otherwise re-read ~200 docs.
 *
 * Retries once: this read is the difference between a full guide page and an
 * empty one, and a single slow response during a prerender would otherwise
 * bake an empty page into the deployed HTML.
 */
export async function fetchFoodPlaces({ attempts = 2 } = {}) {
  if (foodCache) return foodCache
  let lastErr
  for (let i = 0; i < attempts; i++) {
    try {
      const snap = await getDocs(query(
        collection(db, 'places'),
        where('city', '==', 'Bangkok'),
        where('type', '==', 'food'),
      ))
      const places = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => p.name_en || p.name)
      if (places.length) {
        foodCache = places
        return places
      }
      lastErr = new Error('empty result')
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr || new Error('food fetch failed')
}

export function placesInZone(places, zone) {
  if (!zone) return []
  return places.filter(p => zone.districts.includes(districtOf(p)))
}

/** Sort so a page opens with its most useful entries rather than random ones. */
export function rankPlaces(list) {
  return [...list].sort((a, b) => {
    const score = p => (p.is_universal ? 2 : 0) + (p.is_hidden_gem ? 1 : 0)
    const d = score(b) - score(a)
    if (d !== 0) return d
    return (a.name_en || a.name || '').localeCompare(b.name_en || b.name || '')
  })
}

export function displayName(p) {
  return p.name_en || p.name || 'Unnamed'
}

/** Single-point Google Maps link — no API key, no billing (see CLAUDE.md). */
export function mapsUrl(p) {
  const lat = p.location?.latitude ?? p.latitude
  const lng = p.location?.longitude ?? p.longitude
  if (lat == null || lng == null) return null
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
}

export function durationLabel(p) {
  const m = Number(p.duration_minutes ?? p.duration_min)
  if (!Number.isFinite(m) || m <= 0) return null
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60), r = m % 60
  return r ? `${h} hr ${r} min` : `${h} hr`
}
