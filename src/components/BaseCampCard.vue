<script setup>
import { computed, onMounted, watch } from 'vue'
import { trackCTA, trackBaseCampImpression, trackHotelClick } from '@/composables/useAnalytics'

const props = defineProps({
  hotels:   { type: Array,  default: () => [] },
  zoneName: { type: String, required: true },
  zoneCopy: { type: String, default: '' },
})

const AGODA_CID = '1964186'
const BANGKOK_DEST = '17297'
// Klook affiliate smart link (aid=119259) → "eSIM Thailand, QR via email" product
// page. Attribution rides the affiliate.klook.com redirect — don't replace this
// with a direct klook.com URL or the commission is lost.
const KLOOK_SIM_URL = 'https://affiliate.klook.com/sl/2rc1V1q'

const visibleHotels = computed(() => props.hotels.slice(0, 5))
const hasHotels     = computed(() => visibleHotels.value.length > 0)

// Fire one impression per (zone, hotel set).
let impressionFired = false
function maybeFireImpression() {
  if (impressionFired) return
  impressionFired = true
  trackBaseCampImpression(
    props.zoneName,
    visibleHotels.value.length,
    visibleHotels.value.map(h => h.hotel_id ?? h.id ?? '')
  )
}
onMounted(() => { if (hasHotels.value) maybeFireImpression() })
watch(() => props.hotels.length, n => { if (n > 0) maybeFireImpression() })

function agodaMoreUrl() {
  const q = encodeURIComponent(`${props.zoneName} Bangkok`)
  return `https://www.agoda.com/partners/partnersearch.aspx?cid=${AGODA_CID}&textToSearch=${q}&dest_id=${BANGKOK_DEST}`
}

function klookSimUrl() {
  return KLOOK_SIM_URL
}

function openHotel(hotel, position) {
  // Live API hotels carry hotel.url already CID-signed by Agoda. Static Firestore
  // hotels don't, so for them we fall back to the zone-search URL (also CID-signed).
  const url = hotel?.url || agodaMoreUrl()
  trackHotelClick(hotel, position + 1, props.zoneName)
  trackCTA('agoda_hotel', hotel?.hotel_name || props.zoneName, url)
  window.open(url, '_blank', 'noopener,noreferrer')
}

function openAgodaMore() {
  const url = agodaMoreUrl()
  trackCTA('agoda_more', props.zoneName, url)
  window.open(url, '_blank', 'noopener,noreferrer')
}

function openKlookSim() {
  const url = klookSimUrl()
  trackCTA('klook_sim', props.zoneName, url)
  window.open(url, '_blank', 'noopener,noreferrer')
}

function starStr(stars) {
  if (!stars) return null
  return '★'.repeat(stars) + '☆'.repeat(5 - stars)
}
</script>

<template>
  <div class="glass-panel bc-card">
    <!-- Header -->
    <div class="mb-4">
      <p class="bc-eyebrow data-mono">
        <span class="bc-ring" aria-hidden="true"></span> Base camp · Interchange
      </p>
      <h2 class="bc-title display-cond">Stay in {{ zoneName }}</h2>
      <p v-if="zoneCopy" class="bc-copy">{{ zoneCopy }}</p>
      <p v-else class="bc-copy">
        Best zone for your route. Walkable to most of your spots, easy BTS access.
      </p>
    </div>

    <!-- Five hotel picks (diverse mix) -->
    <div v-if="hasHotels" class="bc-list">
      <div
        v-for="(hotel, idx) in visibleHotels"
        :key="hotel.id"
        class="bc-hotel-row"
        role="button"
        tabindex="0"
        :aria-label="`Book ${hotel.hotel_name} on Agoda`"
        @click="openHotel(hotel, idx)"
        @keydown.enter.space.prevent="openHotel(hotel, idx)"
      >
        <img
          v-if="hotel.photo1"
          :src="hotel.photo1"
          :alt="hotel.hotel_name"
          class="bc-hotel-img"
        />
        <div v-else class="bc-hotel-img bc-hotel-img-placeholder">
          <i class="fa-solid fa-bed"></i>
        </div>
        <div class="flex-1 min-w-0">
          <div class="bc-hotel-name-row">
            <p class="bc-hotel-name">{{ hotel.hotel_name }}</p>
            <span v-if="hotel.is_sponsored" class="bc-badge bc-badge-sponsored">Featured</span>
            <span v-else-if="hotel.is_live" class="bc-badge bc-badge-live">Live</span>
          </div>
          <div class="bc-hotel-meta">
            <span v-if="hotel.star_rating" class="bc-stars">{{ starStr(hotel.star_rating) }}</span>
            <span v-if="hotel.rating_average" class="bc-rating data-mono">{{ hotel.rating_average.toFixed(1) }}/10</span>
            <span v-if="!hotel.star_rating && !hotel.rating_average" class="bc-zone data-mono">{{ hotel.zone }}</span>
            <span v-if="hotel.rates_from" class="bc-price data-mono">
              <span v-if="hotel.discount_percentage" class="bc-discount data-mono">-{{ Math.round(hotel.discount_percentage) }}%</span>
              {{ hotel.rates_currency || 'THB' }} {{ Math.round(hotel.rates_from).toLocaleString() }}
              <span class="bc-price-suffix">/night</span>
            </span>
          </div>
        </div>
        <button class="bc-book-btn" tabindex="-1">Book</button>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else class="bc-empty">
      <div class="bc-empty-icon">
        <i class="fa-solid fa-bed"></i>
      </div>
      <p class="bc-empty-text">
        No live picks in {{ zoneName }} yet. <span class="bc-empty-em">See more on Agoda</span> below.
      </p>
    </div>

    <!-- Primary CTA — single Agoda affiliate link (CID-tracked) -->
    <button class="bc-agoda-more" @click="openAgodaMore">
      <span>Find more places to stay on Agoda</span>
      <i class="fa-solid fa-arrow-right"></i>
    </button>

    <!-- SIM / Connectivity upsell — Klook -->
    <button class="bc-sim-row" @click="openKlookSim">
      <div class="bc-sim-icon">
        <i class="fa-solid fa-sim-card"></i>
      </div>
      <div class="bc-sim-body">
        <p class="bc-sim-title">eSIM for Bangkok?</p>
        <p class="bc-sim-copy">No queue, no plastic — QR in your inbox before you land</p>
      </div>
      <i class="fa-solid fa-arrow-right bc-sim-arrow"></i>
    </button>
  </div>
</template>

<style scoped>
/* Receipt treatment — this card is literally a purchase decision (real
   prices, a Book button), the most honest "receipt" moment in the app.
   Tilts like it's sitting on the paper; straightens on hover like picking
   it up to read. */
.bc-card {
  padding: 22px 22px 18px;
  position: relative;
  transform: rotate(-1deg);
  box-shadow: var(--shadow-lift);
  transition: transform 0.4s cubic-bezier(.2,.8,.3,1);
}
.bc-card:hover { transform: rotate(0deg); }
.bc-eyebrow {
  font-size: 10px; text-transform: uppercase;
  color: var(--orange-text); margin-bottom: 6px;
  display: flex; align-items: center; gap: 7px;
}
/* Interchange symbol — double ring, like a transfer station on a transit map */
.bc-ring {
  width: 12px; height: 12px;
  border-radius: 50%;
  border: 2px solid var(--ink);
  box-shadow: inset 0 0 0 2px #fff, inset 0 0 0 4px var(--ink);
  flex-shrink: 0;
}
.bc-title {
  font-size: 22px; color: var(--ink);
  line-height: 1.15; margin-bottom: 8px;
}
.bc-copy {
  font-size: 13px; color: var(--muted); line-height: 1.5; margin: 0;
}

/* Hotel list (5 rows) — framed like the line-items on a printed receipt */
.bc-list {
  display: flex; flex-direction: column; gap: 8px;
  margin-bottom: 14px;
  padding: 14px 0;
  border-top: 1px dashed var(--hairline);
  border-bottom: 1px dashed var(--hairline);
}

.bc-hotel-row {
  display: flex; align-items: center; gap: 12px;
  padding: 10px; border-radius: 8px;
  background: #fff;
  border: 1px solid var(--hairline);
  cursor: pointer;
  transition: border-color 0.15s, transform 0.2s ease-out, box-shadow 0.2s ease-out;
}
.bc-hotel-row:hover { border-color: var(--ink); transform: translateY(-3px); box-shadow: var(--shadow-md); }

.bc-hotel-img {
  width: 52px; height: 52px; border-radius: 6px; object-fit: cover; flex-shrink: 0;
  border: 1px solid var(--hairline);
}
.bc-hotel-img-placeholder {
  background: var(--paper);
  display: flex; align-items: center; justify-content: center;
  color: var(--muted); font-size: 18px;
}
.bc-zone {
  font-size: 10px; color: var(--muted);
  text-transform: uppercase;
}
.bc-hotel-name-row {
  display: flex; align-items: center; gap: 6px;
  min-width: 0;
}
.bc-hotel-name {
  font-size: 13px; font-weight: 700; color: var(--ink); margin: 0;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  flex: 1; min-width: 0;
}
.bc-badge {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 8.5px; font-weight: 500;
  padding: 2px 6px; border-radius: 999px; text-transform: uppercase;
  flex-shrink: 0;
}
.bc-badge-live { border: 1px solid var(--line-2); color: #0E5F57; background: #fff; }
/* Stamped, not just labeled — this is real sponsorship data, so it earns
   the emphasis. Thicker border + tilt reads as a rubber stamp. */
.bc-badge-sponsored {
  border: 2px solid var(--line-1); color: var(--orange-text); background: #fff;
  display: inline-block;
  font-weight: 700;
  transform: rotate(-6deg);
}

.bc-hotel-meta {
  font-size: 11px; color: var(--muted); font-weight: 500;
  display: flex; align-items: center; gap: 6px; margin-top: 4px;
  flex-wrap: wrap;
}
.bc-stars { color: var(--ink); letter-spacing: 1px; }
.bc-rating { color: #0E5F57; font-size: 10px; }
.bc-price {
  color: var(--ink); font-size: 11px;
  display: inline-flex; align-items: center; gap: 4px;
}
.bc-price-suffix { color: var(--muted); font-size: 10px; }
.bc-discount {
  background: var(--ink); color: var(--signal);
  font-size: 9px;
  padding: 1px 5px; border-radius: 999px;
}

.bc-book-btn {
  padding: 7px 16px; border-radius: 999px;
  background: var(--ink); color: #fff;
  font-size: 12px; font-weight: 700; border: none; cursor: pointer;
  transition: transform 0.08s ease-out;
  font-family: 'IBM Plex Sans Thai', sans-serif;
}
.bc-book-btn:active { transform: translateY(1px); }

/* Empty state */
.bc-empty {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 16px; margin-bottom: 12px;
  background: #fff;
  border: 1px dashed var(--hairline);
  border-radius: 8px;
}
.bc-empty-icon {
  width: 36px; height: 36px; flex-shrink: 0;
  border-radius: 8px;
  background: var(--paper);
  display: flex; align-items: center; justify-content: center;
  color: var(--muted); font-size: 14px;
}
.bc-empty-text {
  font-size: 12.5px; line-height: 1.5; color: var(--ink);
  font-weight: 500; margin: 0;
}
.bc-empty-em { color: var(--orange-text); font-weight: 700; }

/* "Find more on Agoda" — the ONE orange CTA on the result screen (main revenue) */
.bc-agoda-more {
  display: flex; align-items: center; justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 13px 16px;
  border-radius: 8px;
  border: none;
  background: var(--line-1);
  color: #fff;
  font-size: 13px; font-weight: 700;
  cursor: pointer;
  transition: transform 0.08s ease-out, background 0.15s ease-out;
  margin-bottom: 12px;
  font-family: 'IBM Plex Sans Thai', sans-serif;
}
.bc-agoda-more:hover  { background: #F07E33; }
.bc-agoda-more:active { transform: translateY(1px); }
.bc-agoda-more i { font-size: 11px; }

/* SIM upsell row — Klook */
.bc-sim-row {
  display: flex; align-items: center; gap: 12px;
  width: 100%;
  padding: 12px 14px;
  border-radius: 8px;
  border: 1px solid var(--hairline);
  background: #fff;
  color: var(--ink);
  cursor: pointer;
  transition: border-color 0.15s, transform 0.2s ease-out, box-shadow 0.2s ease-out;
  text-align: left;
  font-family: 'IBM Plex Sans Thai', sans-serif;
}
.bc-sim-row:hover { border-color: var(--line-2); transform: translateY(-2px); box-shadow: var(--shadow-sm); }
.bc-sim-icon {
  width: 36px; height: 36px;
  flex-shrink: 0;
  border-radius: 8px;
  background: #fff;
  border: 1px solid var(--line-2);
  display: flex; align-items: center; justify-content: center;
  color: var(--line-2); font-size: 15px;
}
.bc-sim-body { flex: 1; min-width: 0; }
.bc-sim-title {
  font-size: 12.5px; font-weight: 700; color: var(--ink);
  margin: 0 0 2px;
}
.bc-sim-copy {
  font-size: 11px; color: var(--muted);
  font-weight: 500; margin: 0;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.bc-sim-arrow {
  font-size: 11px; color: var(--muted);
  flex-shrink: 0;
}
</style>
