import { getAnalytics, isSupported, logEvent, setUserProperties } from 'firebase/analytics'
import { getApp } from 'firebase/app'
import { initCountry, getCountrySync } from './useCountry'

let analytics = null
isSupported().then(yes => {
  if (!yes) return
  analytics = getAnalytics(getApp())
  // Attach country as a user property as soon as it resolves so GA4 can segment
  // by it even on events that fired before detection finished.
  initCountry().then(country => {
    if (country && analytics) {
      try { setUserProperties(analytics, { user_country: country }) } catch {}
    }
  })
}).catch(() => {})

function track(event, params) {
  if (!analytics) return
  const country = getCountrySync()
  try {
    logEvent(analytics, event, country ? { ...params, user_country: country } : params)
  } catch {}
}

export function trackSwipe(direction, place) {
  track('card_swipe', {
    direction,
    place_name: place.name_en || place.name,
    place_type: place.type,
    place_zone: place.zone,
    vibe_tags: place.vibe_tags?.join(',') ?? ''
  })
}

export function trackCTA(type, label, url = '') {
  track('cta_click', {
    cta_type: type,
    cta_label: label,
    destination: url,
    city: 'Bangkok'
  })
}

export function trackRouteView(numPlaces, numDays, mode, vibe) {
  track('route_viewed', {
    num_places: numPlaces,
    num_days: numDays,
    trip_mode: mode,
    vibe
  })
}

export function trackShareRoute(routeId, meta = {}) {
  track('route_shared', { route_id: routeId, ...meta })
}

export function trackModeSelected(mode) {
  track('mode_selected', { mode })
}

export function trackVibeSelected(vibe) {
  track('vibe_selected', { vibe })
}

export function trackBaseCampImpression(zoneName, hotelCount, hotelIds) {
  track('basecamp_impression', {
    zone: zoneName,
    hotel_count: hotelCount,
    hotel_ids: (hotelIds || []).join(',')
  })
}

export function trackHotelClick(hotel, position, zoneName) {
  track('hotel_click', {
    hotel_id: hotel?.hotel_id ?? hotel?.id ?? '',
    hotel_name: hotel?.hotel_name ?? '',
    zone: zoneName,
    position,
    rating_average: hotel?.rating_average ?? null,
    star_rating: hotel?.star_rating ?? null,
    is_sponsored: !!hotel?.is_sponsored,
    destination: hotel?.url ?? ''
  })
}
