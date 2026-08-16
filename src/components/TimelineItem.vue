<script setup>
import { computed } from 'vue'
import { useTripStore } from '@/stores/useTripStore'
import { trackCTA } from '@/composables/useAnalytics'

const props = defineProps({
  place: { type: Object, required: true },
  index: { type: Number, required: true },
  theme: { type: String, default: 'dark' }, // 'dark' (RouteView) | 'light' (ResultView)
})

const store = useTripStore()

const displayName = computed(() =>
  store.lang === 'th' ? props.place.name : (props.place.name_en || props.place.name)
)

const displayDesc = computed(() =>
  store.lang === 'th'
    ? (props.place.description || props.place.insight_th || props.place.description_tourist)
    : (props.place.description_tourist || props.place.insight_en || props.place.description)
)

const safeAffiliateLink = computed(() => {
  const url = props.place.affiliate_link
  if (!url) return null
  try {
    const u = new URL(url)
    return u.protocol === 'http:' || u.protocol === 'https:' ? url : null
  } catch { return null }
})
</script>

<template>
  <div class="station-row" :class="theme === 'light' ? 'sr-light' : 'sr-dark'" :style="{ '--stop-i': index }">
    <!-- Time column (timetable) -->
    <div class="sr-time data-mono">{{ place.time_tag }}</div>

    <!-- Track column: continuous line + station dot -->
    <div class="sr-track" aria-hidden="true">
      <span class="sr-line sr-line-top" :class="{ 'sr-line-hidden': index === 0 }"></span>
      <span class="sr-dot"></span>
      <span class="sr-line sr-line-bottom"></span>
    </div>

    <!-- Body -->
    <div class="sr-body">
      <div class="sr-tags">
        <span class="sr-code data-mono">S{{ index + 1 }}</span>
        <span v-if="place.type" class="sr-type data-mono">{{ place.type }}</span>
      </div>

      <h3 class="sr-name">{{ displayName }}</h3>

      <p class="sr-insight">{{ displayDesc }}</p>

      <!-- Meta -->
      <div class="sr-meta">
        <span v-if="place.zone_en || place.zone"><i class="fa-solid fa-location-dot"></i> {{ place.zone_en || place.zone }}</span>
        <span v-if="place.price_range" class="data-mono">{{ place.price_range }}</span>
      </div>

      <a
        v-if="safeAffiliateLink"
        :href="safeAffiliateLink"
        target="_blank" rel="noopener noreferrer"
        class="sr-link"
        @click="trackCTA('timeline_check_rooms', displayName, safeAffiliateLink)"
      >
        Check rooms →
      </a>

      <!-- Transfer badge: nearest transit -->
      <div v-if="place.nearest_transit_en || place.nearest_transit" class="sr-transfer">
        <p class="sr-transfer-station">
          <i class="fa-solid fa-train-subway"></i> {{ place.nearest_transit_en || place.nearest_transit }}
        </p>
        <p v-if="place.transit_note_en" class="sr-transfer-note">
          {{ place.transit_note_en }}
        </p>
      </div>
    </div>

    <!-- Thumbnail -->
    <div class="sr-thumb-wrap">
      <img
        :src="place.image_url || `https://placehold.co/80x80/FF8C42/white?text=BKK`"
        :alt="place.name"
        class="sr-thumb"
      />
    </div>
  </div>
</template>

<style scoped>
/* StationRow — a dot on a continuous colored line.
   Line color per day is inherited via --row-line set by the parent day block. */
.station-row {
  display: grid;
  grid-template-columns: 52px 18px minmax(0, 1fr) auto;
  column-gap: 10px;
  align-items: start;
  padding: 14px 0 0;
  /* Stops stagger in as the route line draws — extends the existing
     ResultView signature motion, not a new one. */
  animation: sr-enter 0.5s cubic-bezier(.2,.75,.2,1) both;
  animation-delay: calc(var(--stop-i, 0) * 55ms);
}
@keyframes sr-enter {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: none; }
}

/* Time column */
.sr-time {
  font-size: 10px;
  text-transform: uppercase;
  text-align: right;
  padding-top: 3px;
  white-space: nowrap;
}
.sr-light .sr-time { color: var(--muted); }
.sr-dark  .sr-time { color: rgba(255,255,255,0.55); }

/* Track: line runs through the whole row, dot sits on it */
.sr-track {
  display: flex;
  flex-direction: column;
  align-items: center;
  align-self: stretch;
}
.sr-line {
  width: 3px;
  background: var(--row-line, var(--line-1));
}
.sr-line-top    { height: 17px; flex: none; }
.sr-line-bottom { flex: 1; }
.sr-line-hidden { visibility: hidden; }
.station-row:last-child .sr-line-bottom { visibility: hidden; }
.sr-dot {
  width: 13px; height: 13px;
  border-radius: 50%;
  flex: none;
  border: 3px solid var(--row-line, var(--line-1));
}
.sr-light .sr-dot { background: #fff; }
.sr-dark  .sr-dot { background: var(--ink); }

/* Body */
.sr-body { padding-bottom: 18px; min-width: 0; }

.sr-tags {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}
.sr-code, .sr-type {
  font-size: 9.5px;
  text-transform: uppercase;
  padding: 1px 7px;
  border-radius: 999px; /* station-code pill */
}
.sr-light .sr-code { background: var(--ink); color: #fff; }
.sr-dark  .sr-code { background: #fff; color: var(--ink); }
.sr-light .sr-type { border: 1px solid var(--hairline); color: var(--muted); background: #fff; }
.sr-dark  .sr-type { border: 1px solid rgba(255,255,255,0.25); color: rgba(255,255,255,0.65); }

.sr-name {
  font-size: 15px;
  font-weight: 700;
  line-height: 1.25;
  margin: 0;
}
.sr-light .sr-name { color: var(--ink); }
.sr-dark  .sr-name { color: #fff; }

.sr-insight {
  font-size: 12px;
  line-height: 1.55;
  margin: 4px 0 0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.sr-light .sr-insight { color: var(--muted); }
.sr-dark  .sr-insight { color: rgba(255,255,255,0.6); }

.sr-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  margin-top: 6px;
  font-size: 11px;
}
.sr-meta i { font-size: 10px; margin-right: 3px; }
.sr-light .sr-meta { color: var(--muted); }
.sr-dark  .sr-meta { color: rgba(255,255,255,0.55); }

.sr-link {
  display: inline-block;
  margin-top: 6px;
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
}
.sr-light .sr-link { color: var(--orange-text); }
.sr-dark  .sr-link { color: var(--signal); }
.sr-link:active { transform: translateY(1px); }

/* Transfer badge — nearest transit, always visible when data exists */
.sr-transfer {
  margin-top: 9px;
  padding: 7px 11px;
  border-radius: 8px;
  font-size: 11px;
  line-height: 1.45;
}
.sr-light .sr-transfer { background: #fff; border: 1px solid var(--hairline); }
.sr-dark  .sr-transfer { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.16); }
.sr-transfer-station {
  margin: 0;
  font-weight: 700;
}
.sr-light .sr-transfer-station { color: var(--ink); }
.sr-dark  .sr-transfer-station { color: #fff; }
.sr-light .sr-transfer-station i { color: var(--line-2); margin-right: 5px; }
.sr-dark  .sr-transfer-station i { color: var(--signal); margin-right: 5px; }
.sr-transfer-note { margin: 2px 0 0 20px; }
.sr-light .sr-transfer-note { color: var(--muted); }
.sr-dark  .sr-transfer-note { color: rgba(255,255,255,0.5); }

/* Thumbnail — flat, sharp */
.sr-thumb-wrap { flex-shrink: 0; }
.sr-thumb {
  width: 56px; height: 56px;
  border-radius: 6px;
  object-fit: cover;
  display: block;
}
.sr-light .sr-thumb { border: 1px solid var(--hairline); }
.sr-dark  .sr-thumb { border: 1px solid rgba(255,255,255,0.16); }

/* 360px: keep four columns but tighten */
@media (max-width: 380px) {
  .station-row { grid-template-columns: 44px 16px minmax(0, 1fr) auto; column-gap: 8px; }
  .sr-time { font-size: 9px; }
  .sr-thumb { width: 48px; height: 48px; }
}
</style>
