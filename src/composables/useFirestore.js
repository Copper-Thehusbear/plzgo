import { db } from '@/firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { placeLat, placeLng } from './useDistance'

// Session-lifetime cache: the `places` snapshot per city survives route changes,
// so revisiting /swipe doesn't re-download the whole collection (~500 docs).
// A page reload is the invalidation; empty results are never cached so a
// failed or mid-reseed fetch can be retried on the next visit.
const cityCache = new Map()

async function fetchCityPlaces(city) {
  if (cityCache.has(city)) return cityCache.get(city)
  const snapshot = await getDocs(query(collection(db, 'places'), where('city', '==', city)))
  // Drop places without coordinates at the ingestion point — routing, map
  // markers and contextual pins all require location downstream.
  const places = snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter(p => placeLat(p) != null && placeLng(p) != null)
  if (places.length) cityCache.set(city, places)
  return places
}

export function useFirestore() {

  function shuffle(arr) {
    const copy = [...arr]
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]]
    }
    return copy
  }

  function bkkNow() {
    const now = new Date()
    return { h: (now.getUTCHours() + 7) % 24, m: now.getUTCMinutes() }
  }

  function currentTimeTag() {
    const { h } = bkkNow()
    if (h < 11) return 'Morning'
    if (h < 15) return 'Afternoon'
    if (h < 19) return 'Evening'
    return 'Night'
  }

  function isOpenNow(openingHours) {
    if (!openingHours) return true
    // Accept en dash, em dash, or hyphen between times ("08:00–18:00", "08:00 - 18:00")
    const parts = openingHours.split(/[–—-]/)
    if (parts.length < 2) return true
    const toMins = t => {
      const [h, m] = t.trim().split(':').map(Number)
      if (isNaN(h) || h < 0 || h > 23) return null
      return h * 60 + (isNaN(m) ? 0 : Math.min(m, 59))
    }
    const start = toMins(parts[0])
    const end   = toMins(parts[1])
    if (start === null || end === null) return true
    const { h, m } = bkkNow()
    const nowMins = h * 60 + m
    return start <= end ? nowMins >= start && nowMins <= end : nowMins >= start || nowMins <= end
  }

  // Returns 0–N: how many of the selectedVibes this place matches
  function vibeScore(place, selectedVibes) {
    let score = 0
    for (const vibe of selectedVibes) {
      if (
        place.vibe_primary === vibe ||
        place.vibe_secondary === vibe ||
        place.vibe_tags?.includes(vibe)
      ) score++
    }
    return score
  }

  async function fetchCardPool(city, selectedVibes, modeConfig, openNow = false, gayFilterOn = false, localModeOn = false) {
    let places = await fetchCityPlaces(city)

    // Vibe filter — keep places with at least 1 vibe match
    if (selectedVibes.length && !selectedVibes.includes('all')) {
      places = places.filter(p => vibeScore(p, selectedVibes) > 0)
    }

    // Mode filters
    if (modeConfig.universalOnly) {
      places = places.filter(p => p.is_universal === true)
    }
    if (modeConfig.excludeTypes?.length) {
      const exTypes = new Set(modeConfig.excludeTypes)
      places = places.filter(p => !exTypes.has(p.type) && !exTypes.has(p.category))
    }
    if (modeConfig.maxDuration) {
      places = places.filter(p => {
        const dur = p.duration_minutes ?? p.duration_min
        return !dur || dur <= modeConfig.maxDuration
      })
    }

    if (openNow) {
      places = places.filter(p => isOpenNow(p.opening_hours))
    }

    // Local mode: prefer hidden gems; backfill if fewer than 10
    if (localModeOn) {
      const gems    = places.filter(p => p.is_hidden_gem === true)
      const nonGems = places.filter(p => !p.is_hidden_gem)
      if (gems.length >= 10) {
        places = gems
      } else {
        places = [...gems, ...shuffle(nonGems).slice(0, Math.max(10 - gems.length, 0))]
      }
    }

    if (!places.length) return []

    // Shuffle first, then stable-sort by score — ties end up in random order,
    // so the deck differs between sessions instead of always repeating.
    places = shuffle(places)

    // Score-based sort: vibe overlap + hidden gem bonus
    places.sort((a, b) => {
      const sa = vibeScore(a, selectedVibes) + (a.is_hidden_gem ? 0.5 : 0)
      const sb = vibeScore(b, selectedVibes) + (b.is_hidden_gem ? 0.5 : 0)
      return sb - sa
    })

    // Gay filter: boost high gay_score places; is_gay_exclusive float to top when Gay Vibe selected
    if (gayFilterOn) {
      const hasGayVibe = selectedVibes.includes('gay-vibe')
      places.sort((a, b) => {
        const ga = (hasGayVibe && a.is_gay_exclusive ? 2 : 0) + (a.gay_score >= 7 ? 1 : 0)
        const gb = (hasGayVibe && b.is_gay_exclusive ? 2 : 0) + (b.gay_score >= 7 ? 1 : 0)
        return gb - ga
      })
    }

    // Cap to cardLimit (order: score desc, random within ties)
    const pool = places.slice(0, modeConfig.cardLimit)

    // Time-of-day ordering: preferred time first
    const preferred = currentTimeTag()
    const timeField = p => p.time_tag || p.match_time_of_day
    return [
      ...pool.filter(p => timeField(p) === preferred),
      ...pool.filter(p => timeField(p) !== preferred),
    ]
  }

  return { fetchCardPool }
}
