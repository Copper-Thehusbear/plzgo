/**
 * Lightweight country/geo detection for analytics.
 *
 * GA4 already attaches country to every event server-side via IP — viewable in the
 * Audience → Geography report. This composable adds a second pass for cases where
 * we want country on our own records (per-route Firestore docs) or as an event
 * param for custom-funnel filters in the GA4 explorer.
 *
 * Strategy: call api.country.is (free, no key, no quota) once, cache to localStorage
 * for 7 days. If the call fails (offline, blocked, abuse-list), we silently return
 * null and analytics still fire — country just won't be attached.
 */
const CACHE_KEY = 'plzgo_country_v1'
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000  // 7 days

let cachedPromise = null
let resolvedCountry = null

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const obj = JSON.parse(raw)
    if (Date.now() - obj.t > CACHE_TTL) return null
    return obj.country || null
  } catch { return null }
}

function writeCache(country) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ country, t: Date.now() })) } catch {}
}

async function detect() {
  const cached = readCache()
  if (cached) return cached
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 2000)
    // api.country.is returns { ip: "...", country: "TH" }
    const r = await fetch('https://api.country.is/', { signal: ctrl.signal })
    clearTimeout(t)
    if (!r.ok) return null
    const j = await r.json()
    const country = (j?.country || '').toUpperCase() || null
    if (country) writeCache(country)
    return country
  } catch { return null }
}

// Kick off detection on first import — non-blocking.
export function initCountry() {
  if (cachedPromise) return cachedPromise
  cachedPromise = detect().then(c => { resolvedCountry = c; return c })
  return cachedPromise
}

// Sync accessor — used inside analytics.track where we don't want to await.
// Returns whatever has been resolved so far (null until the first detect() completes).
export function getCountrySync() {
  return resolvedCountry || readCache()
}

// Async — use when you can wait (e.g. before writing the route doc to Firestore).
export async function getCountry() {
  if (resolvedCountry) return resolvedCountry
  return await initCountry()
}
