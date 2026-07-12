import { httpsCallable } from 'firebase/functions'
import { functions } from '@/firebase'

const callable = httpsCallable(functions, 'getNearbyHotels')

// Default to tomorrow → day-after for the live-pricing query. We don't have a UI for
// date selection yet; this is "what does it cost to stay near here tonight-ish" which
// is the question lazy-planners would ask first.
function defaultDates() {
  const fmt = d => d.toISOString().slice(0, 10)
  const ci = new Date()
  ci.setDate(ci.getDate() + 1)
  const co = new Date(ci)
  co.setDate(co.getDate() + 1)
  return { checkin: fmt(ci), checkout: fmt(co) }
}

export async function fetchLiveHotels({ lat, lng, radius = 2, currency = 'THB', maxResult = 10 } = {}) {
  if (typeof lat !== 'number' || typeof lng !== 'number') return { hotels: [], fallback: true }
  const { checkin, checkout } = defaultDates()
  try {
    const res = await callable({ lat, lng, radius, currency, maxResult, checkin, checkout })
    const data = res?.data || {}
    if (data.fallback || !Array.isArray(data.hotels)) return { hotels: [], fallback: true }
    return { hotels: data.hotels, source: data.source || 'api' }
  } catch (e) {
    // Function not deployed yet, network error, auth failure — all silent. BaseCampCard
    // already has static hotels on screen by this point.
    console.warn('[useHotelsApi] callable failed:', e?.message || e)
    return { hotels: [], fallback: true }
  }
}
