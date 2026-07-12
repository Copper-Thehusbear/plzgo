import { useDistance } from './useDistance'

const { haversine } = useDistance()
const DAY_MINUTES = 480

// Handle both nested location object and flat lat/lng fields
function lat(p) { return p.location?.latitude ?? p.latitude }
function lng(p) { return p.location?.longitude ?? p.longitude }

function calcDays(places) {
  const totalMins = places.reduce((sum, p) => sum + (p.duration_minutes || 60) + 30, 0)
  return Math.min(3, Math.max(1, Math.ceil(totalMins / DAY_MINUTES)))
}

function kMeansClusters(places, k) {
  if (places.length <= k) return places.map(p => [p])

  let centroids = Array.from({ length: k }, (_, i) =>
    places[Math.floor(i * places.length / k)]
  ).map(p => ({ lat: lat(p), lng: lng(p) }))

  let clusters = []
  for (let iter = 0; iter < 10; iter++) {
    clusters = Array.from({ length: k }, () => [])

    for (const place of places) {
      let nearest = 0, nearestDist = Infinity
      for (let i = 0; i < k; i++) {
        const d = haversine(lat(place), lng(place), centroids[i].lat, centroids[i].lng)
        if (d < nearestDist) { nearestDist = d; nearest = i }
      }
      clusters[nearest].push(place)
    }

    // Redistribute empty clusters by pulling from largest
    let changed = true
    while (changed) {
      changed = false
      for (let i = 0; i < clusters.length; i++) {
        if (clusters[i].length === 0) {
          const bigIdx = clusters.reduce((max, c, j) => c.length > clusters[max].length ? j : max, 0)
          clusters[i].push(clusters[bigIdx].pop())
          changed = true
        }
      }
    }

    const newCentroids = clusters.map(c => ({
      lat: c.reduce((s, p) => s + lat(p), 0) / c.length,
      lng: c.reduce((s, p) => s + lng(p), 0) / c.length,
    }))

    if (JSON.stringify(newCentroids) === JSON.stringify(centroids)) break
    centroids = newCentroids
  }

  return clusters.filter(c => c.length > 0)
}

function nearestNeighbor(places) {
  if (places.length <= 1) return [...places]
  const unvisited = [...places]
  const route = [unvisited.shift()]
  while (unvisited.length > 0) {
    const last = route[route.length - 1]
    let bestIdx = 0, bestDist = Infinity
    for (let i = 0; i < unvisited.length; i++) {
      const d = haversine(lat(last), lng(last), lat(unvisited[i]), lng(unvisited[i]))
      if (d < bestDist) { bestDist = d; bestIdx = i }
    }
    route.push(unvisited.splice(bestIdx, 1)[0])
  }
  return route
}

function twoOpt(route) {
  if (route.length <= 3) return route
  let best = [...route]
  let improved = true
  let iters = 0
  const maxIters = best.length * best.length

  while (improved && iters < maxIters) {
    improved = false
    iters++
    for (let i = 0; i < best.length - 1; i++) {
      for (let j = i + 2; j < best.length; j++) {
        const curr =
          haversine(lat(best[i]), lng(best[i]), lat(best[i+1]), lng(best[i+1])) +
          (j + 1 < best.length ? haversine(lat(best[j]), lng(best[j]), lat(best[j+1]), lng(best[j+1])) : 0)
        const swap =
          haversine(lat(best[i]), lng(best[i]), lat(best[j]), lng(best[j])) +
          (j + 1 < best.length ? haversine(lat(best[i+1]), lng(best[i+1]), lat(best[j+1]), lng(best[j+1])) : 0)
        if (swap < curr - 1e-10) {
          best = [...best.slice(0, i+1), ...best.slice(i+1, j+1).reverse(), ...best.slice(j+1)]
          improved = true
        }
      }
    }
  }
  return best
}

function sortByTimeWithinRoute(route) {
  const timeOf = p => p.time_tag || p.match_time_of_day || 'Anytime'
  const daytime   = route.filter(p => ['Morning', 'Afternoon', 'Anytime'].includes(timeOf(p)))
  const nighttime = route.filter(p => ['Evening', 'Night'].includes(timeOf(p)))
  if (!nighttime.length || !daytime.length) return nearestNeighbor(route)
  return [...nearestNeighbor(daytime), ...nearestNeighbor(nighttime)]
}

// Spread duplicate categories across days so a single day isn't all saunas / all temples.
// Max 1 place per category per day; overflow moves to the day with the fewest of that category.
function spreadCategoryDiversity(days) {
  if (days.length <= 1) return days

  const result = days.map(d => [...d])
  let changed = true

  // Up to N passes to settle redistributions
  for (let pass = 0; pass < 3 && changed; pass++) {
    changed = false
    for (let d = 0; d < result.length; d++) {
      const seen = new Map()
      const overflow = []
      const kept = []

      for (const place of result[d]) {
        const cat = place.category || place.type || 'other'
        if (!seen.has(cat)) {
          kept.push(place)
          seen.set(cat, true)
        } else {
          overflow.push(place)
        }
      }

      if (!overflow.length) continue
      result[d] = kept
      changed = true

      for (const place of overflow) {
        const cat = place.category || place.type || 'other'
        let bestDay = -1, bestCount = Infinity
        for (let i = 0; i < result.length; i++) {
          if (i === d) continue
          const cnt = result[i].filter(p => (p.category || p.type || 'other') === cat).length
          if (cnt < bestCount) { bestCount = cnt; bestDay = i }
        }
        if (bestDay >= 0) result[bestDay].push(place)
        else result[d].push(place) // no better day, keep in same day
      }
    }
  }

  return result
}

export function buildOptimalDays(swipedPlaces) {
  if (!swipedPlaces.length) return { days: [], numDays: 0 }
  if (swipedPlaces.length === 1) return { days: [[...swipedPlaces]], numDays: 1 }

  const numDays = calcDays(swipedPlaces)
  const clusters = kMeansClusters(swipedPlaces, numDays)
  const days = clusters.map(cluster => {
    const nn        = nearestNeighbor(cluster)
    const optimized = twoOpt(nn)
    return sortByTimeWithinRoute(optimized)
  })

  return { days: spreadCategoryDiversity(days), numDays }
}

export function buildDayGeoJSON(dayBlocks) {
  const DAY_COLORS = ['#FF8C42', '#3B82F6', '#0D9488']
  const features = []
  dayBlocks.forEach((block, dayIdx) => {
    block.forEach((place, i) => {
      const plat = lat(place), plng = lng(place)
      if (plat == null || plng == null) return
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [plng, plat] },
        properties: {
          id: place.id,
          name: place.name_en || place.name,
          description: place.description_tourist || place.description || '',
          dayIndex,
          placeIndex: i,
          color: DAY_COLORS[dayIdx] ?? DAY_COLORS[0],
          type: place.type,
          image_url: place.image_url || null,
        },
      })
    })
  })
  return { type: 'FeatureCollection', features }
}

export function buildMapsUrl(places) {
  const valid = places.filter(p => lat(p) != null && lng(p) != null)
  if (!valid.length) return null
  const waypoints = valid.slice(0, 10).map(p => `${lat(p)},${lng(p)}`)
  return 'https://www.google.com/maps/dir/' + waypoints.join('/')
}
