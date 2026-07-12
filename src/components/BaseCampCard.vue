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
// Klook affiliate ID TBD — user will swap once deal is signed. Leaving plain URL
// so the link works for users immediately and conversion can be retroactively tracked.
const KLOOK_AFFILIATE_PARAM = ''

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
  const base = 'https://www.klook.com/en-US/search/?query=sim+card+bangkok'
  return KLOOK_AFFILIATE_PARAM ? `${base}&${KLOOK_AFFILIATE_PARAM}` : base
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
      <p class="bc-eyebrow">
        <i class="fa-solid fa-bed"></i> Base Camp
      </p>
      <h2 class="bc-title">Stay in {{ zoneName }}</h2>
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
            <span v-if="hotel.rating_average" class="bc-rating">{{ hotel.rating_average.toFixed(1) }} / 10</span>
            <span v-if="!hotel.star_rating && !hotel.rating_average" class="bc-zone">{{ hotel.zone }}</span>
            <span v-if="hotel.rates_from" class="bc-price">
              <span v-if="hotel.discount_percentage" class="bc-discount">-{{ Math.round(hotel.discount_percentage) }}%</span>
              {{ hotel.rates_currency || 'THB' }} {{ Math.round(hotel.rates_from).toLocaleString() }}
              <span class="bc-price-suffix">/night</span>
            </span>
          </div>
        </div>
        <button @click="openHotel(hotel, idx)" class="bc-book-btn">Book</button>
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
        <p class="bc-sim-title">Travel SIM for Bangkok?</p>
        <p class="bc-sim-copy">Skip the airport queue — pre-book unlimited 5G on Klook</p>
      </div>
      <i class="fa-solid fa-arrow-right bc-sim-arrow"></i>
    </button>
  </div>
</template>

<style scoped>
.bc-card {
  padding: 22px 22px 18px;
}
.bc-eyebrow {
  font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.18em;
  color: var(--orange); margin-bottom: 6px;
  display: flex; align-items: center; gap: 6px;
}
.bc-eyebrow i { font-size: 10px; }
.bc-title {
  font-size: 22px; font-weight: 900; color: var(--navy); letter-spacing: -0.02em;
  line-height: 1.15; margin-bottom: 8px;
}
.bc-copy {
  font-size: 13px; color: #64748B; line-height: 1.5; margin: 0;
}

/* Hotel list (5 rows) */
.bc-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; }

.bc-hotel-row {
  display: flex; align-items: center; gap: 12px;
  padding: 10px; border-radius: 16px;
  background: rgba(255,255,255,0.45);
  border: 1.5px solid rgba(255,255,255,0.7);
  transition: all 0.2s;
}
.bc-hotel-row:hover { background: rgba(255,255,255,0.65); border-color: var(--orange); }

.bc-hotel-img {
  width: 52px; height: 52px; border-radius: 12px; object-fit: cover; flex-shrink: 0;
}
.bc-hotel-img-placeholder {
  background: linear-gradient(135deg, rgba(255,140,66,0.15) 0%, rgba(255,140,66,0.05) 100%);
  display: flex; align-items: center; justify-content: center;
  color: var(--orange); font-size: 18px;
}
.bc-zone {
  font-size: 10.5px; font-weight: 700; color: rgba(30,41,59,0.45);
  text-transform: uppercase; letter-spacing: 0.08em;
}
.bc-hotel-name-row {
  display: flex; align-items: center; gap: 6px;
  min-width: 0;
}
.bc-hotel-name {
  font-size: 13px; font-weight: 800; color: var(--navy); margin: 0;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  flex: 1; min-width: 0;
}
.bc-badge {
  font-size: 8.5px; font-weight: 900; letter-spacing: 0.06em;
  padding: 2px 6px; border-radius: 4px; text-transform: uppercase;
  flex-shrink: 0;
}
.bc-badge-live { background: rgba(34,197,94,0.12); color: #15803D; }
.bc-badge-sponsored { background: rgba(255,140,66,0.18); color: #C2610A; }

.bc-hotel-meta {
  font-size: 11px; color: #94A3B8; font-weight: 600;
  display: flex; align-items: center; gap: 6px; margin-top: 4px;
  flex-wrap: wrap;
}
.bc-stars { color: #F59E0B; letter-spacing: 1px; }
.bc-rating { color: #0F766E; font-weight: 700; font-size: 10px; }
.bc-price {
  color: var(--navy); font-weight: 800; font-size: 11px;
  display: inline-flex; align-items: center; gap: 4px;
}
.bc-price-suffix { color: #94A3B8; font-weight: 600; font-size: 10px; }
.bc-discount {
  background: #DC2626; color: #fff;
  font-size: 9px; font-weight: 900;
  padding: 1px 5px; border-radius: 4px;
}

.bc-book-btn {
  padding: 7px 16px; border-radius: 99px;
  background: var(--orange); color: #fff;
  font-size: 12px; font-weight: 800; border: none; cursor: pointer;
  box-shadow: 0 4px 12px rgba(255,140,66,0.3);
  transition: all 0.2s;
}
.bc-book-btn:active { transform: scale(0.94); }

/* Empty state */
.bc-empty {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 16px; margin-bottom: 12px;
  background: rgba(255,140,66,0.06);
  border: 1px dashed rgba(255,140,66,0.25);
  border-radius: 14px;
}
.bc-empty-icon {
  width: 36px; height: 36px; flex-shrink: 0;
  border-radius: 10px;
  background: rgba(255,140,66,0.12);
  display: flex; align-items: center; justify-content: center;
  color: var(--orange); font-size: 14px;
}
.bc-empty-text {
  font-size: 12.5px; line-height: 1.5; color: rgba(30,41,59,0.65);
  font-weight: 600; margin: 0;
}
.bc-empty-em { color: var(--orange); font-weight: 800; }

/* "Find more on Agoda" — primary outbound CTA */
.bc-agoda-more {
  display: flex; align-items: center; justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 13px 16px;
  border-radius: 14px;
  border: 1.5px solid rgba(255,140,66,0.45);
  background: rgba(255,140,66,0.08);
  color: #C2610A;
  font-size: 13px; font-weight: 800;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 12px;
}
.bc-agoda-more:hover {
  background: var(--orange);
  border-color: var(--orange);
  color: #fff;
  transform: translateY(-1px);
  box-shadow: 0 8px 20px rgba(255,140,66,0.3);
}
.bc-agoda-more i { font-size: 11px; }

/* SIM upsell row — Klook */
.bc-sim-row {
  display: flex; align-items: center; gap: 12px;
  width: 100%;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid rgba(15,118,110,0.18);
  background: rgba(15,118,110,0.05);
  color: var(--navy);
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}
.bc-sim-row:hover {
  background: rgba(15,118,110,0.1);
  border-color: rgba(15,118,110,0.35);
}
.bc-sim-icon {
  width: 36px; height: 36px;
  flex-shrink: 0;
  border-radius: 10px;
  background: rgba(15,118,110,0.12);
  display: flex; align-items: center; justify-content: center;
  color: #0F766E; font-size: 15px;
}
.bc-sim-body { flex: 1; min-width: 0; }
.bc-sim-title {
  font-size: 12.5px; font-weight: 800; color: var(--navy);
  margin: 0 0 2px;
}
.bc-sim-copy {
  font-size: 11px; color: #64748B;
  font-weight: 600; margin: 0;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.bc-sim-arrow {
  font-size: 11px; color: #94A3B8;
  flex-shrink: 0;
}
</style>
