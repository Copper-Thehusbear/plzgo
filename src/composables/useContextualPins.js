import { computed } from 'vue'
import { useDistance } from './useDistance'

const RADIUS_KM = 0.75 // ~10 min walk

export function useContextualPins(swipedPlaces, cardPool) {
  const { haversine } = useDistance()

  return computed(() => {
    if (!swipedPlaces.value?.length || !cardPool.value?.length) return []

    const swipedIds = new Set(swipedPlaces.value.map(p => p.id))

    const results = []

    for (const place of cardPool.value) {
      if (swipedIds.has(place.id)) continue
      const plat = place.location?.latitude ?? place.latitude
      const plng = place.location?.longitude ?? place.longitude
      if (!plat) continue

      let nearestDist = Infinity
      let nearestSwiped = null

      for (const swiped of swipedPlaces.value) {
        const slat = swiped.location?.latitude ?? swiped.latitude
        const slng = swiped.location?.longitude ?? swiped.longitude
        if (!slat) continue
        const d = haversine(slat, slng, plat, plng)
        if (d < nearestDist) { nearestDist = d; nearestSwiped = swiped }
      }

      if (nearestDist <= RADIUS_KM) {
        results.push({
          place,
          walkMinutes: Math.max(1, Math.round(nearestDist * 12)),
          nearestName: nearestSwiped ? (nearestSwiped.name_en || nearestSwiped.name) : null,
          lat: plat, lng: plng,
        })
      }
    }

    return results.slice(0, 5)
  })
}
