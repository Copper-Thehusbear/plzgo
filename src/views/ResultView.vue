<script setup>
import { ref, computed, onMounted } from 'vue'
import { useTripStore } from '@/stores/useTripStore'
import { buildOptimalDays } from '@/composables/useRouting'
import { useContextualPins } from '@/composables/useContextualPins'
import { findNearestZone } from '@/composables/useZoneCentroid'
import { useWeather } from '@/composables/useWeather'
import { useDistance } from '@/composables/useDistance'
import { fetchLiveHotels } from '@/composables/useHotelsApi'
import { db } from '@/firebase'
import { collection, addDoc, getDocs, query, where, limit, serverTimestamp } from 'firebase/firestore'
import { trackRouteView, trackCTA, trackShareRoute } from '@/composables/useAnalytics'
import { getCountry } from '@/composables/useCountry'
import MapCanvas from '@/components/MapCanvas.vue'
import TimelineItem from '@/components/TimelineItem.vue'
import BaseCampCard from '@/components/BaseCampCard.vue'
import ContextPinCard from '@/components/ContextPinCard.vue'
import DonationModal from '@/components/DonationModal.vue'
import AppLayout from '@/components/AppLayout.vue'

const store = useTripStore()

const routeResult    = computed(() => buildOptimalDays(store.swipedPlaces))
const dayBlocks      = computed(() => routeResult.value.days)
const numDays        = computed(() => routeResult.value.numDays)
const contextualPins = useContextualPins(
  computed(() => store.swipedPlaces),
  computed(() => store.cardPool)
)
const zone = computed(() => findNearestZone(store.swipedPlaces))

const activePin = ref(null)
const toastMsg  = ref(null)
let   toastTimer = null

const showDonation = ref(false)
function openDonation() {
  trackCTA('donation_open', 'ResultView tip row')
  showDonation.value = true
}

function showToast(msg) {
  toastMsg.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastMsg.value = null }, 2200)
}

function onPinClick(entry) { activePin.value = entry }
function onPinYep() {
  if (!activePin.value) return
  const added = store.swipeYep(activePin.value.place)
  if (added) showToast('Added to itinerary')
  activePin.value = null
}
function onPinNope() { activePin.value = null }

const routeId   = ref(null)
const copied    = ref(false)
const hotels    = ref([])
const saveError = ref(false)

const weather           = ref(null)
const weatherDismissed  = ref(false)
const indoorSuggestions = ref([])
const showingIndoor     = ref(false)

const { fetchWeather } = useWeather()
const { haversine }    = useDistance()

const allPlaces     = computed(() => dayBlocks.value.flat())
const hasOutdoor    = computed(() => allPlaces.value.some(p => p.is_outdoor === true))
const showRainBanner = computed(() =>
  !weatherDismissed.value &&
  weather.value !== null &&
  hasOutdoor.value &&
  (weather.value.isRainy || weather.value.isComing)
)

function findIndoorAlternatives() {
  const outdoorPlaces = allPlaces.value.filter(p => p.is_outdoor === true)
  if (!outdoorPlaces.length) return []
  const pool = store.cardPool.filter(p => p.is_outdoor === false)
  const seen = new Set(store.swipedPlaces.map(p => p.id))
  const results = []
  for (const candidate of pool) {
    if (seen.has(candidate.id)) continue
    const lat = candidate.location?.latitude
    const lng = candidate.location?.longitude
    if (!lat || !lng) continue
    const nearEnough = outdoorPlaces.some(op =>
      haversine(lat, lng, op.location.latitude, op.location.longitude) <= 2
    )
    if (nearEnough) results.push(candidate)
    if (results.length >= 3) break
  }
  return results
}

function onFindIndoor() {
  indoorSuggestions.value = findIndoorAlternatives()
  showingIndoor.value = true
  weatherDismissed.value = true
}

function onKeepPlan() {
  weatherDismissed.value = true
  showingIndoor.value = false
}

function onIndoorYep(place) {
  store.swipeYep(place)
  showToast('Added to itinerary')
  indoorSuggestions.value = indoorSuggestions.value.filter(p => p.id !== place.id)
}

function onIndoorNope(place) {
  indoorSuggestions.value = indoorSuggestions.value.filter(p => p.id !== place.id)
}

// Line colors — must match MapCanvas DAY_COLORS and --line-1/2/3 in style.css
const DAY_COLORS = ['var(--line-1)', 'var(--line-2)', 'var(--line-3)']
const dayLabels  = ['Day 1', 'Day 2', 'Day 3']

onMounted(async () => {
  document.title = `${store.selectedCity} route · plzgo`
  await Promise.all([saveRoute(), loadHotels()])
  trackRouteView(store.swipedPlaces.length, numDays.value, store.tripMode, store.selectedVibes.join(','))
  weather.value = await fetchWeather()
})

async function saveRoute() {
  saveError.value = false
  try {
    // Country: best-effort. If detection hasn't finished within 1s we save without
    // it — never block the route save on a third-party API.
    const country = await Promise.race([
      getCountry(),
      new Promise(r => setTimeout(() => r(null), 1000)),
    ])
    const doc = await addDoc(collection(db, 'routes'), {
      places: store.swipedPlaces, city: store.selectedCity,
      vibes: store.selectedVibes, mode: store.tripMode,
      days: numDays.value, createdAt: serverTimestamp(),
      created_country: country || null,
      referrer:        document.referrer || null,
      ua:              navigator.userAgent.slice(0, 200),
    })
    routeId.value = doc.id
  } catch (e) {
    console.error('Failed to save route:', e)
    saveError.value = true
  }
}

// Maps hub zone names (from useZoneCentroid) → Firestore `hotels.zone` (canonical Bangkok districts).
// The hub is the cluster centroid — same name shown in BaseCampCard's "Stay in X" title, so the
// hotels returned must live inside the hub's catchment, not scattered across every swiped zone.
const HUB_HOTEL_ZONES = {
  'Sukhumvit':       ['Watthana', 'Khlong Toei'],
  'Silom / Sathorn': ['Bang Rak', 'Sathon', 'Bang Kho Laem'],
  'Old City':        ['Phra Nakhon', 'Pom Prap Sattru Phai', 'Dusit'],
  'Thonglor':        ['Watthana'],
  'Yaowarat':        ['Samphanthawong', 'Pom Prap Sattru Phai', 'Bang Rak'],
  'Chatuchak':       ['Chatuchak', 'Phaya Thai'],
  'Ari':             ['Phaya Thai', 'Chatuchak'],
  'Riverside':       ['Bang Rak', 'Bang Kho Laem', 'Khlong San'],
}

async function loadHotels() {
  if (!store.swipedPlaces.length) return

  const hub = findNearestZone(store.swipedPlaces)
  const hubZones = (hub?.name && HUB_HOTEL_ZONES[hub.name]) || []
  const directZones = [...new Set(store.swipedPlaces.map(p => p.zone || p.zone_en).filter(Boolean))]
  // Prefer hub zones (they cluster around the BaseCamp anchor); fall back to direct
  // zones only when the hub isn't mapped or returns nothing.
  const primary = hubZones.length ? [...new Set(hubZones)].slice(0, 10) : directZones.slice(0, 10)
  if (!primary.length) return

  async function queryByZones(zones) {
    const snap = await getDocs(
      query(collection(db, 'hotels'), where('zone', 'in', zones), limit(30))
    )
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(h => h.photo1)
      .sort((a, b) => {
        const ra = a.rating_average || 0
        const rb = b.rating_average || 0
        if (rb !== ra) return rb - ra
        return (b.number_of_reviews || 0) - (a.number_of_reviews || 0)
      })
  }

  let staticResults = []
  try {
    staticResults = await queryByZones(primary)
    if (!staticResults.length && hubZones.length && directZones.length) {
      // Hub returned nothing — try the user's actual swiped zones as a safety net.
      staticResults = await queryByZones(directZones.slice(0, 10))
    }
    // Paint a diverse 5 immediately so BaseCampCard has something to show within ~100ms.
    hotels.value = selectDiverseHotels(staticResults, 5)
  } catch (e) {
    console.error('hotels collection read failed:', e)
  }

  // Progressive enhancement: ask the Cloud Function for live pricing near the hub
  // centroid. If anything goes wrong (function not deployed, Agoda down, timeout),
  // fetchLiveHotels returns { fallback: true } and we keep the static list.
  if (!hub?.lat || !hub?.lng) return
  const { hotels: liveHotels, fallback } = await fetchLiveHotels({
    lat: hub.lat, lng: hub.lng, radius: 2, maxResult: 15,
  })
  if (fallback || !liveHotels.length) return
  // mergeHotels keeps sponsored Firestore picks first; we still want the diverse
  // selector applied to the final list so the 5 shown span hostel→5-star, not 5 luxury.
  hotels.value = selectDiverseHotels(mergeHotels(staticResults, liveHotels), 5)
}

// Pick a diverse set of N hotels across star tiers + accommodation types. The
// raw Firestore list is sorted by rating, which clusters 4-5 star Sukhumvit
// hotels at the top — boring + doesn't help travellers of different budgets.
// This walks star buckets (5→4→3) and accommodation types in round-robin order,
// then backfills from the rating-sorted tail to hit the count.
function selectDiverseHotels(list, count = 5) {
  if (list.length <= count) return list

  const out = []
  const seen = new Set()
  const push = (h) => {
    if (!h || seen.has(h.id)) return false
    seen.add(h.id); out.push(h); return true
  }

  // Always preserve active sponsored slots at the top of the diverse list.
  const now = Date.now()
  const isActiveSponsored = h => h.is_sponsored && (!h.sponsor_until || new Date(h.sponsor_until).getTime() > now)
  list.filter(isActiveSponsored).forEach(push)

  // Buckets — already rating-sorted because `list` came from queryByZones.
  const byStar = {
    5: list.filter(h => h.star_rating >= 5),
    4: list.filter(h => h.star_rating === 4),
    3: list.filter(h => h.star_rating === 3),
  }
  const hostels = list.filter(h => /hostel|hostle|backpacker/i.test(h.accommodation_type || h.hotel_name || ''))

  // Round-robin: 5★ → 4★ → hostel → 3★ → 4★ (loop) — gives at least 1 of each.
  const rotation = [byStar[5], byStar[4], hostels, byStar[3], byStar[4], byStar[5]]
  let i = 0
  while (out.length < count && i < rotation.length * 3) {
    const bucket = rotation[i % rotation.length]
    const pick = bucket.find(h => !seen.has(h.id))
    if (pick) push(pick)
    i++
  }
  // Backfill from the top of the rating-sorted list.
  for (const h of list) { if (out.length >= count) break; push(h) }
  return out.slice(0, count)
}

// Merge order:
//   1. Sponsored slots from the static (Firestore) list — we control these, never let Agoda displace.
//   2. Live API hotels by rating (live pricing is the value-add).
//   3. Static non-sponsored as filler if API returned <3.
// Dedupe by hotel_id so a hotel that appears in both lists shows once (preferring the live entry,
// since it carries dailyRate and discount fields).
function mergeHotels(staticHotels, liveHotels) {
  const now = Date.now()
  const isActiveSponsored = h => h.is_sponsored && (!h.sponsor_until || new Date(h.sponsor_until).getTime() > now)
  const sponsored = staticHotels.filter(isActiveSponsored)

  const out = []
  const seen = new Set()
  const push = h => {
    const id = String(h.hotel_id ?? h.id ?? h.hotel_name)
    if (seen.has(id)) return
    seen.add(id)
    out.push(h)
  }
  sponsored.forEach(push)
  liveHotels.forEach(push)
  staticHotels.filter(h => !isActiveSponsored(h)).forEach(push)
  return out
}

async function copyLink() {
  if (saveError.value) { await saveRoute(); return }
  if (!routeId.value) return
  const url = `${window.location.origin}/route/${routeId.value}`
  trackCTA('share', 'Copy link', url)
  trackShareRoute(routeId.value, {
    city: store.selectedCity,
    days: numDays.value,
    num_places: store.swipedPlaces.length,
    trip_mode: store.tripMode,
  })
  try {
    await navigator.clipboard.writeText(url)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch { prompt('Copy this link:', url) }
}
</script>

<template>
  <AppLayout>
    <template #header>
      <!-- Fixed nav -->
      <nav class="glass-nav h-16 w-full">
        <div class="max-w-7xl mx-auto h-full px-4 md:px-6 lg:px-8 flex items-center justify-between">
          <span class="rv-wordmark" style="cursor:pointer" @click="$router.push('/')">plz<span style="color:var(--orange)">go</span></span>
          <div style="display:flex;align-items:center;gap:10px">
            <button
              v-if="routeId && !saveError"
              class="rv-share-btn"
              @click="copyLink"
            >
              <i :class="copied ? 'fa-solid fa-check' : 'fa-solid fa-link'"></i>
              {{ copied ? 'Copied!' : 'Share' }}
            </button>
            <span v-else class="rv-saving">
              <i class="fa-solid fa-circle-notch fa-spin"></i>
              {{ saveError ? 'Save failed' : 'Saving...' }}
            </span>
            <button class="m-back-btn" @click="$router.push('/plan')">
              <i class="fa-solid fa-arrow-left" style="font-size:11px"></i>
              Reset
            </button>
          </div>
        </div>
      </nav>
    </template>

    <!-- Scrollable content -->
    <div class="flex-1 overflow-y-auto pt-16"> <!-- Compensate for fixed header -->
      <div class="rv-inner max-w-7xl mx-auto px-4 md:px-6 lg:px-8">

        <!-- Grid -->
        <div class="flex flex-col gap-4 lg:grid lg:grid-cols-[1fr_380px] lg:gap-8">

          <!-- Left / main col -->
          <div class="rv-col-main">

            <!-- Route title — issued boarding pass -->
            <div class="rv-header-card plz-paper plz-notched">
              <span class="plz-stamp plz-stamp-green rv-header-stamp">Issued</span>
              <p class="plz-eyebrow">Boarding pass</p>
              <h1 class="rv-city display-cond">{{ store.selectedCity }}</h1>
              <div class="plz-perf"></div>
              <dl class="rv-ticket-row">
                <div>
                  <dt>Days</dt>
                  <dd class="data-mono">{{ numDays }}</dd>
                </div>
                <div>
                  <dt>Stops</dt>
                  <dd class="data-mono">{{ store.swipedPlaces.length }}</dd>
                </div>
                <div class="rv-ticket-vibe">
                  <dt>Line</dt>
                  <dd>{{ store.selectedVibes.join(' + ') }}</dd>
                </div>
              </dl>
            </div>

            <!-- Weather alert banner -->
            <Transition name="fade">
              <div v-if="showRainBanner" class="rv-weather-banner">
                <div class="rv-weather-banner-body">
                  <i class="fa-solid fa-cloud-rain rv-weather-icon"></i>
                  <div>
                    <p class="rv-weather-title">
                      {{ weather.isRainy ? "It's raining" : "Rain expected soon" }}
                      — {{ weather.isRainy ? "want to swap outdoor spots for indoor alternatives nearby?" : "we can suggest indoor alternatives" }}
                    </p>
                  </div>
                </div>
                <div class="rv-weather-actions">
                  <button class="rv-weather-btn-primary" @click="onFindIndoor">
                    {{ weather.isRainy ? "Find Indoor Spots" : "Show Alternatives" }}
                  </button>
                  <button class="rv-weather-btn-ghost" @click="onKeepPlan">Keep My Plan</button>
                </div>
              </div>
            </Transition>

            <!-- Map -->
            <div class="glass-panel rv-map-panel h-[40vh] lg:h-[600px]">
              <div v-if="numDays > 1" class="rv-day-chips">
                <span
                  v-for="(label, i) in dayLabels.slice(0, numDays)"
                  :key="i"
                  class="rv-day-chip data-mono"
                  :style="{ background: DAY_COLORS[i] }"
                >● {{ label }}</span>
              </div>
              <div v-if="contextualPins.length" class="rv-pin-badge data-mono">
                {{ contextualPins.length }} unmarked
              </div>
              <MapCanvas
                v-if="dayBlocks.length"
                :dayBlocks="dayBlocks"
                :contextualPins="contextualPins"
                @pin-click="onPinClick"
              />
            </div>

            <!-- Contextual pins hint — unmarked stops -->
            <div v-if="contextualPins.length" class="rv-pins-hint">
              <span class="rv-pins-dot" aria-hidden="true"></span>
              <div>
                <p class="rv-pins-title">
                  <span class="data-mono">{{ contextualPins.length }}</span> unmarked stop{{ contextualPins.length > 1 ? 's' : '' }} near your line
                </p>
                <p class="rv-pins-sub">Tap a gold pin on the map to add it</p>
              </div>
            </div>

          </div><!-- /rv-col-main -->

          <!-- Right / aside col -->
          <div class="rv-col-side">

            <!-- Weather panel -->
            <div v-if="weather && weather.precipProb !== null" class="glass-panel p-4 rv-weather-card">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <i :class="`fa-solid ${weather.weatherIcon} text-xl`" style="color:var(--muted)"></i>
                  <div>
                    <p class="rv-eyebrow data-mono" style="margin:0 0 2px">Bangkok now</p>
                    <p class="text-[14px] font-bold leading-tight" style="color:var(--ink)">
                      <span v-if="weather.temp != null" class="data-mono">{{ weather.temp }}°C</span>
                      <span v-if="weather.temp != null" class="font-medium opacity-50 mx-1">·</span>
                      {{ weather.weatherLabel }}
                    </p>
                  </div>
                </div>
                <span class="text-[13px] data-mono" style="color:var(--muted)">{{ weather.precipProb }}%</span>
              </div>
              <p v-if="weather.tip" class="text-[11px] font-semibold mt-3 pt-3" style="color:var(--muted); border-top:1px solid var(--hairline)">
                {{ weather.tip }}
              </p>
            </div>

            <!-- Indoor alternatives -->
            <Transition name="fade">
              <div v-if="showingIndoor" class="glass-panel p-5">
                <p class="rv-eyebrow data-mono" style="margin-bottom:12px">Indoor alternatives nearby</p>
                <div v-if="indoorSuggestions.length" class="flex flex-col">
                  <div
                    v-for="place in indoorSuggestions"
                    :key="place.id"
                    class="rv-indoor-row"
                  >
                    <div class="flex-1 min-w-0">
                      <p class="text-[13px] font-bold leading-tight" style="color:var(--ink)">
                        {{ store.lang === 'th' ? place.name : (place.name_en || place.name) }}
                      </p>
                      <p class="text-[11px] font-medium mt-0.5" style="color:var(--muted)">{{ store.lang === 'th' ? (place.zone_th || place.zone) : (place.zone_en || place.zone) }}</p>
                    </div>
                    <div class="flex gap-2 flex-shrink-0">
                      <button class="rv-indoor-btn rv-indoor-skip" @click="onIndoorNope(place)" aria-label="Skip stop">
                        <i class="fa-solid fa-xmark text-xs"></i>
                      </button>
                      <button class="rv-indoor-btn rv-indoor-board" @click="onIndoorYep(place)" aria-label="Board">
                        <i class="fa-solid fa-plus text-xs"></i>
                      </button>
                    </div>
                  </div>
                </div>
                <p v-else class="text-[12px] font-medium" style="color:var(--muted)">No indoor stops within <span class="data-mono">2 km</span>.</p>
              </div>
            </Transition>

            <!-- Basecamp — shows even without hotels (Agoda/Klook fallback) -->
            <BaseCampCard
              v-if="zone"
              :hotels="hotels"
              :zoneName="zone.name"
              :zoneCopy="zone.copy"
            />

            <!-- Day blocks -->
            <div
              v-for="(block, dayIndex) in dayBlocks"
              :key="dayIndex"
              class="glass-panel rv-day-block"
              :style="{ '--row-line': DAY_COLORS[dayIndex] }"
            >
              <span v-if="numDays > 1" class="plz-secnum rv-day-num">{{ dayIndex + 1 }}</span>
              <div v-if="numDays > 1" class="rv-day-label data-mono" :style="{ background: DAY_COLORS[dayIndex] }">
                ● Line {{ dayIndex + 1 }} · {{ dayLabels[dayIndex] }}
              </div>
              <TimelineItem
                v-for="(place, i) in block"
                :key="place.id"
                :place="place"
                :index="i"
                theme="light"
              />
            </div>

            <!-- Skeleton -->
            <div v-if="!dayBlocks.length" class="flex flex-col gap-4">
              <div v-for="i in 4" :key="i" class="glass-panel h-24 animate-pulse bg-slate-50/50"></div>
            </div>

            <!-- Actions -->
            <div class="glass-panel p-5 flex gap-3">
              <button class="rv-plan-btn flex-1" @click="$router.push('/plan')">
                <i class="fa-solid fa-rotate-left mr-1.5"></i> Plan another
              </button>
              <button v-if="saveError" class="rv-retry-btn flex-1" @click="saveRoute">
                <i class="fa-solid fa-arrow-rotate-right mr-1.5"></i> Retry save
              </button>
            </div>

            <!-- Tip row — quiet by design; the screen's loud CTA belongs to Agoda -->
            <!-- The bill. Every line is ฿0, so the ask lands after the value
                 has been itemised rather than before. Still nothing
                 interruptive: no modal until the user taps the tip line. -->
            <div class="rv-bill">
              <span class="plz-stamp plz-stamp-green rv-bill-stamp">Free</span>
              <p class="rv-bill-head data-mono">Your bill</p>
              <div class="rv-bill-line data-mono">
                <span>{{ numDays }}-day route · {{ store.swipedPlaces.length }} stops</span><b>฿0</b>
              </div>
              <div class="rv-bill-line data-mono">
                <span>Hand-checked places</span><b>฿0</b>
              </div>
              <div class="rv-bill-line data-mono">
                <span>Map + shareable link</span><b>฿0</b>
              </div>
              <div class="rv-bill-perf"></div>
              <div class="rv-bill-total data-mono">
                <span>Total</span><b>฿0.00</b>
              </div>
              <button class="rv-bill-tip" @click="openDonation">
                <span>Tip the local?</span>
                <span class="rv-bill-amt data-mono">฿20 →</span>
              </button>
            </div>

          </div><!-- /rv-col-side -->
        </div><!-- /rv-grid -->

      </div>
    </div>

    <!-- Context pin overlay -->
    <Transition name="ctx-sheet">
      <ContextPinCard
        v-if="activePin"
        :place="activePin.place"
        :walkMinutes="activePin.walkMinutes"
        :nearestName="activePin.nearestName"
        @yep="onPinYep"
        @nope="onPinNope"
      />
    </Transition>

    <!-- Donation modal -->
    <DonationModal v-if="showDonation" @close="showDonation = false" />

    <!-- Toast -->
    <Transition name="toast">
      <div v-if="toastMsg" class="rv-toast">{{ toastMsg }}</div>
    </Transition>

  </AppLayout>
</template>

<style scoped>
.rv-wordmark {
  font-family: 'IBM Plex Sans Condensed', 'IBM Plex Sans Thai', sans-serif;
  font-size: 19px;
  font-weight: 700;
  color: var(--ink);
}
/* Ink block — the screen's ONE orange CTA is the Agoda button in BaseCampCard */
.rv-share-btn {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 7px 16px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  background: var(--ink);
  color: #fff;
  border: none;
  cursor: pointer;
  transition: transform 0.08s ease-out;
  font-family: 'IBM Plex Sans Thai', sans-serif;
}
.rv-share-btn:active { transform: translateY(1px); }

.rv-saving {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--muted);
}

.rv-inner {
  padding-top: 24px;
  padding-bottom: max(env(safe-area-inset-bottom), 100px);
}

.rv-col-main, .rv-col-side {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
@media (min-width: 1024px) {
  .rv-col-main {
    position: sticky;
    top: 76px;
  }
}

/* Boarding pass — tilted, notched, stamped. Straightens on hover. */
/* Gentler tilt than the small paper objects — the same angle on an element
   this wide reads as a layout mistake rather than a tilted ticket. */
.rv-header-card {
  padding: 26px 30px 22px;
  border-radius: 8px;
  overflow: visible;
  margin-top: 6px;
  transform: rotate(-1deg);
}
.rv-header-card:hover { transform: rotate(0deg); }
.rv-header-stamp { top: -13px; right: 14px; transform: rotate(-9deg); }
/* Wayfinding label — short mono sign */
.rv-eyebrow {
  font-size: 10px;
  text-transform: uppercase;
  color: var(--orange-text);
  margin: 0 0 8px;
}
.rv-city {
  font-size: clamp(32px, 7vw, 44px);
  color: var(--ink);
  line-height: 1.02;
  margin: 0;
  letter-spacing: -0.02em;
}
/* Ticket data strip — label above value, mono numerals, like a real stub */
.rv-ticket-row {
  display: flex;
  gap: 28px;
  margin: 0;
  flex-wrap: wrap;
}
.rv-ticket-row dt {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 3px;
}
.rv-ticket-row dd {
  margin: 0;
  font-size: 19px;
  font-weight: 700;
  color: var(--ink);
  line-height: 1.1;
}
.rv-ticket-vibe dd {
  font-size: 15px;
  padding-top: 3px;
  text-transform: capitalize;
}

.rv-map-panel {
  position: relative;
  overflow: hidden;
  padding: 6px;
}
.rv-map-panel :deep(.leaflet-container) {
  border-radius: 6px;
  overflow: hidden;
  height: 100%;
}
.rv-day-chips {
  position: absolute;
  top: 14px; left: 14px;
  z-index: 1000;
  display: flex;
  gap: 6px;
}
/* Line badge — solid block in the day's line color */
.rv-day-chip {
  padding: 4px 11px;
  border-radius: 999px;
  font-size: 10.5px;
  text-transform: uppercase;
  color: #fff;
}
.rv-pin-badge {
  position: absolute;
  top: 14px; right: 14px;
  z-index: 1000;
  padding: 4px 11px;
  border-radius: 999px;
  background: var(--signal);
  border: 1px solid var(--ink);
  font-size: 10.5px;
  text-transform: uppercase;
  color: var(--ink);
}

/* Unmarked-stop hint — dashed signal border, like ContextPinCard */
.rv-pins-hint {
  padding: 14px 18px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: #fff;
  border: 1px dashed var(--signal);
  border-radius: 8px;
}
.rv-pins-dot {
  width: 14px; height: 14px;
  border-radius: 50%;
  background: var(--signal);
  border: 2px solid var(--ink);
  flex-shrink: 0;
  margin-top: 2px;
}
.rv-pins-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--ink);
  margin: 0 0 2px;
}
.rv-pins-sub {
  font-size: 12px;
  color: var(--muted);
  margin: 0;
}

.rv-day-block {
  padding: 8px 18px 4px;
  position: relative;
  overflow: hidden;   /* clips the oversized day numeral */
}
/* Day numeral as watermark — the block is literally "Line 2", so the
   figure earns its place instead of being decoration. */
.rv-day-num {
  top: 2px;
  right: 14px;
  font-size: clamp(4.5rem, 14vw, 7.5rem);
}
.rv-day-block > *:not(.rv-day-num) { position: relative; z-index: 1; }
/* Line badge above each day's stations */
.rv-day-label {
  display: inline-block;
  font-size: 10px;
  text-transform: uppercase;
  color: #fff;
  padding: 3px 10px;
  border-radius: 999px;
  margin: 12px 0 2px;
}

.rv-indoor-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--hairline);
}
.rv-indoor-row:last-child { border-bottom: none; }
.rv-indoor-btn {
  width: 36px; height: 36px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.08s ease-out;
}
.rv-indoor-btn:active { transform: translateY(1px); }
.rv-indoor-skip {
  background: #fff;
  border: 1px solid var(--hairline);
  color: var(--muted);
}
.rv-indoor-board {
  background: var(--ink);
  border: 1px solid var(--ink);
  color: #fff;
}

.rv-plan-btn {
  height: 48px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  color: var(--ink);
  border: 1px solid var(--hairline);
  cursor: pointer;
  transition: border-color 0.15s, transform 0.08s ease-out;
  font-family: 'IBM Plex Sans Thai', sans-serif;
}
.rv-plan-btn:hover  { border-color: var(--ink); }
.rv-plan-btn:active { transform: translateY(1px); }

.rv-retry-btn {
  height: 48px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  color: #B42318;
  border: 1px solid #B42318;
  cursor: pointer;
  font-family: 'IBM Plex Sans Thai', sans-serif;
}
.rv-retry-btn:active { transform: translateY(1px); }

/* A small aside, so it can afford the tilt the BaseCamp card can't. */
.rv-weather-card {
  transform: rotate(-1.6deg);
  box-shadow: var(--shadow-md);
  transition: transform 0.4s cubic-bezier(.2,.8,.3,1);
}
.rv-weather-card:hover { transform: rotate(0deg); }

/* Thermal-printed slip. Tilts on the desk, straightens when reached for. */
.rv-bill {
  position: relative;
  background: #fff;
  border: 1px solid var(--hairline);
  border-radius: 4px;
  padding: 18px 20px 16px;
  box-shadow: var(--shadow-lift);
  transform: rotate(-1.4deg);
  transition: transform 0.4s cubic-bezier(.2,.8,.3,1);
}
.rv-bill:hover { transform: rotate(0deg); }
/* Stamped across the top-right corner, like a paid-in-full mark */
.rv-bill-stamp {
  top: -14px;
  right: -8px;
  transform: rotate(11deg);
  font-size: 14px;
  letter-spacing: 0.14em;
  padding: 6px 14px;
}
.rv-bill-head {
  font-size: 10px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--ink);
  text-align: center;
  margin: 0 0 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--hairline);
}
.rv-bill-line,
.rv-bill-total {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  font-size: 11px;
  color: var(--muted);
  line-height: 2;
}
.rv-bill-line b { color: var(--ink); font-weight: 500; flex: none; }
.rv-bill-perf {
  height: 0;
  border-top: 1px dashed var(--hairline);
  margin: 8px 0;
}
.rv-bill-total {
  font-size: 13px;
  color: var(--ink);
  font-weight: 700;
}
.rv-bill-total b { color: var(--line-2); }

/* The ask — the only line on the slip that isn't ฿0 */
.rv-bill-tip {
  width: 100%;
  margin-top: 14px;
  padding: 11px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border: 1px dashed var(--line-1);
  border-radius: 6px;
  background: #fff;
  color: var(--ink);
  font-family: 'IBM Plex Sans Thai', sans-serif;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s, transform 0.15s ease-out;
}
.rv-bill-tip:hover  { background: #FFF6EF; transform: translateY(-2px); }
.rv-bill-tip:active { transform: translateY(1px); }
.rv-bill-amt { color: var(--orange-text); font-size: 12px; }

.rv-toast {
  position: fixed;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%);
  padding: 11px 22px;
  border-radius: 8px;
  background: var(--ink);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  z-index: 200;
  pointer-events: none;
}

/* Service-alert strip — ink block, like a platform disruption notice */
.rv-weather-banner {
  padding: 16px 18px;
  border-radius: 8px;
  background: var(--ink);
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.rv-weather-banner-body {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.rv-weather-icon {
  font-size: 16px;
  color: var(--signal);
  margin-top: 2px;
  flex-shrink: 0;
}
.rv-weather-title {
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  margin: 0;
  line-height: 1.5;
}
.rv-weather-actions {
  display: flex;
  gap: 8px;
}
.rv-weather-btn-primary {
  flex: 1;
  height: 38px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  background: var(--signal);
  color: var(--ink);
  border: none;
  cursor: pointer;
  transition: transform 0.08s ease-out;
  font-family: 'IBM Plex Sans Thai', sans-serif;
}
.rv-weather-btn-primary:active { transform: translateY(1px); }
.rv-weather-btn-ghost {
  height: 38px;
  padding: 0 16px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  background: transparent;
  color: rgba(255,255,255,0.75);
  border: 1px solid rgba(255,255,255,0.3);
  cursor: pointer;
  font-family: 'IBM Plex Sans Thai', sans-serif;
}
.rv-weather-btn-ghost:active { transform: translateY(1px); }

.fade-enter-active, .fade-leave-active { transition: all 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(-8px); }

.ctx-sheet-enter-active { transition: opacity 0.3s ease; }
.ctx-sheet-leave-active { transition: opacity 0.2s ease; }
.ctx-sheet-enter-from, .ctx-sheet-leave-to { opacity: 0; }

.toast-enter-active { transition: all 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28); }
.toast-leave-active { transition: all 0.2s ease; }
.toast-enter-from   { opacity: 0; transform: translateX(-50%) translateY(20px); }
.toast-leave-to     { opacity: 0; transform: translateX(-50%) translateY(20px); }
</style>