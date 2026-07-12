// useDistance.js — Haversine formula (offline, no API cost)

// Canonical accessors for the two place-coordinate shapes
// (nested location object from Firestore, flat lat/lng from legacy rows).
// Use these instead of re-implementing the ?? fallback per consumer.
export function placeLat(p) { return p.location?.latitude ?? p.latitude }
export function placeLng(p) { return p.location?.longitude ?? p.longitude }

export function useDistance() {

  function haversine(lat1, lng1, lat2, lng2) {
    const R = 6371 // Earth radius in km
    const dLat = deg2rad(lat2 - lat1)
    const dLng = deg2rad(lng2 - lng1)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2)
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }

  function deg2rad(deg) {
    return deg * (Math.PI / 180)
  }

  // Slot "Anytime" places between fixed time-tagged places
  // by inserting them closest to the nearest fixed-tag neighbor
  function slotAnytimePlaces(fixedPlaces, anytimePlaces) {
    if (!anytimePlaces.length) return fixedPlaces
    if (!fixedPlaces.length) return anytimePlaces

    const result = [...fixedPlaces]

    for (const place of anytimePlaces) {
      let bestIndex = 0
      let bestDist = Infinity

      result.forEach((fixed, i) => {
        const dist = haversine(
          place.location.latitude,
          place.location.longitude,
          fixed.location.latitude,
          fixed.location.longitude
        )
        if (dist < bestDist) {
          bestDist = dist
          bestIndex = i
        }
      })

      // Insert after the closest neighbor
      result.splice(bestIndex + 1, 0, place)
    }

    return result
  }

  return { haversine, slotAnytimePlaces }
}
