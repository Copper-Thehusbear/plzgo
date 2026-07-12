/**
 * Cloud Functions for plzgo.me
 *
 * getNearbyHotels — callable function that proxies Agoda Affiliate Long Tail API.
 * Hides AGODA_API_KEY from the client, caches responses in Firestore for 24h
 * (cuts API spend and latency on repeat views of the same itinerary).
 *
 * Cache key: ${roundedLat}_${roundedLng}_${checkin}_${checkout}_${radius}_${maxResult}
 *   — rounding to 3 decimals (~110m grid) collapses small viewport jitter into one cache entry.
 *
 * Fail-soft: any Agoda error / timeout / non-200 returns { hotels: [], fallback: true }
 * so the client keeps showing its static Firestore picks instead of an empty card.
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { defineSecret } from 'firebase-functions/params'
import { initializeApp } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

initializeApp()
const db = getFirestore()

const AGODA_CID = defineSecret('AGODA_CID')
const AGODA_API_KEY = defineSecret('AGODA_API_KEY')

const AGODA_ENDPOINT = 'https://affiliateapi7643.agoda.com/affiliateservice/lt_v1'
const CACHE_COLLECTION = 'hotels_live_cache'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000  // 24h
const REQUEST_TIMEOUT_MS = 4000

// Agoda image CDN serves http:// — Firebase Hosting is https, mixed-content would block.
const httpsify = (u) => (u || '').replace(/^http:\/\//i, 'https://')

function cacheKey({ lat, lng, checkin, checkout, radius, maxResult }) {
  return [
    lat.toFixed(3),
    lng.toFixed(3),
    checkin,
    checkout,
    radius,
    maxResult,
  ].join('_')
}

// Map Agoda response shape → our internal hotel shape (matches BaseCampCard.vue + Firestore docs).
function normalizeHotel(h) {
  return {
    hotel_id: h.hotelId,
    hotel_name: h.hotelName,
    star_rating: h.starRating ?? null,
    rating_average: h.reviewScore ?? null,
    number_of_reviews: h.reviewCount ?? null,
    photo1: httpsify(h.imageURL),
    url: h.landingURL,                 // already CID-signed by Agoda
    latitude: h.latitude,
    longitude: h.longitude,
    rates_from: h.dailyRate ?? null,
    rates_currency: h.currency ?? 'THB',
    crossed_out_rate: h.crossedOutRate || null,
    discount_percentage: h.discountPercentage || null,
    include_breakfast: !!h.includeBreakfast,
    free_wifi: !!h.freeWifi,
    is_live: true,                     // BaseCampCard uses this to render "Live price" badge
  }
}

export const getNearbyHotels = onCall(
  {
    region: 'asia-southeast1',
    secrets: [AGODA_CID, AGODA_API_KEY],
    cors: true,
    timeoutSeconds: 15,
    memory: '256MiB',
  },
  async (req) => {
    const {
      lat,
      lng,
      checkin,
      checkout,
      radius = 2,
      maxResult = 10,
      currency = 'THB',
      adults = 2,
    } = req.data || {}

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      throw new HttpsError('invalid-argument', 'lat and lng are required numbers')
    }
    if (!checkin || !checkout) {
      throw new HttpsError('invalid-argument', 'checkin and checkout (YYYY-MM-DD) are required')
    }

    const key = cacheKey({ lat, lng, checkin, checkout, radius, maxResult })
    const cacheRef = db.collection(CACHE_COLLECTION).doc(key)

    // 1) Cache lookup
    try {
      const snap = await cacheRef.get()
      if (snap.exists) {
        const cached = snap.data()
        const age = Date.now() - (cached.cachedAt?.toMillis() ?? 0)
        if (age < CACHE_TTL_MS && Array.isArray(cached.hotels)) {
          return { hotels: cached.hotels, source: 'cache', cachedAt: cached.cachedAt.toMillis() }
        }
      }
    } catch (e) {
      console.warn('cache read failed', e.message)
      // fall through — we'll just hit the API
    }

    // 2) Call Agoda
    const body = {
      criteria: {
        additional: {
          currency,
          discountOnly: false,
          language: 'en-us',
          maxResult,
          minimumReviewScore: 6.5,
          minimumStarRating: 3,
          occupancy: { numberOfAdult: adults, numberOfChildren: 0 },
          sortBy: 'Recommended',
        },
        checkInDate: checkin,
        checkOutDate: checkout,
        geo: { latitude: lat, longitude: lng, searchRadius: radius, unit: 'km' },
      },
    }

    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS)
    let hotels = []
    try {
      const res = await fetch(AGODA_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `${AGODA_CID.value()}:${AGODA_API_KEY.value()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      })
      clearTimeout(timer)

      if (!res.ok) {
        const errBody = await res.text().catch(() => '')
        console.warn('Agoda non-200', res.status, errBody.slice(0, 300))
        return { hotels: [], fallback: true, reason: `agoda_${res.status}` }
      }

      const json = await res.json()
      const results = Array.isArray(json.results) ? json.results : []
      hotels = results.map(normalizeHotel).filter(h => h.photo1)
    } catch (e) {
      clearTimeout(timer)
      console.warn('Agoda fetch failed', e.name, e.message)
      return { hotels: [], fallback: true, reason: e.name === 'AbortError' ? 'timeout' : 'fetch_error' }
    }

    // 3) Write cache (best-effort)
    cacheRef.set({
      hotels,
      cachedAt: FieldValue.serverTimestamp(),
      query: { lat, lng, checkin, checkout, radius, maxResult, currency, adults },
    }).catch(e => console.warn('cache write failed', e.message))

    return { hotels, source: 'api' }
  }
)
