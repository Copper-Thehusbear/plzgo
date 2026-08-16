<script setup>
import { computed } from 'vue'
import { displayName, mapsUrl, durationLabel } from '@/composables/useFoodGuide'
import { trackCTA } from '@/composables/useAnalytics'

const props = defineProps({
  place: { type: Object, required: true },
  index: { type: Number, default: 0 },
})

const name     = computed(() => displayName(props.place))
const maps     = computed(() => mapsUrl(props.place))
const duration = computed(() => durationLabel(props.place))
const hours    = computed(() => props.place.opening_hours_en || props.place.opening_hours || null)
const transit  = computed(() => props.place.nearest_transit_en || props.place.nearest_transit || null)
const note     = computed(() => props.place.transit_note_en || props.place.transit_note || null)
const tags     = computed(() => (props.place.vibe_tags || []).slice(0, 3))
const rank     = computed(() => String(props.index + 1).padStart(2, '0'))
</script>

<template>
  <article
    class="fe"
    :class="{ 'fe-must': place.is_universal, 'fe-gem': place.is_hidden_gem && !place.is_universal }"
  >
    <!-- The numeral is the spine of the list: it sets the vertical rhythm and
         does the work a box border would otherwise have to do. -->
    <div class="fe-rank display-cond" aria-hidden="true">{{ rank }}</div>

    <div class="fe-body">
      <header class="fe-head">
        <h3 class="fe-name display-cond">{{ name }}</h3>
        <span v-if="place.price_range" class="fe-price data-mono">{{ place.price_range }}</span>
      </header>

      <div v-if="place.is_universal || place.is_hidden_gem" class="fe-flags">
        <span v-if="place.is_universal" class="fe-flag fe-flag-must data-mono">Must eat</span>
        <span v-if="place.is_hidden_gem" class="fe-flag fe-flag-gem data-mono">Hidden gem</span>
      </div>

      <!-- The reason this page beats a directory listing -->
      <p v-if="place.insight_en" class="fe-insight">{{ place.insight_en }}</p>

      <dl class="fe-data">
        <div v-if="hours">
          <dt>Hours</dt><dd class="data-mono">{{ hours }}</dd>
        </div>
        <div v-if="duration">
          <dt>Allow</dt><dd class="data-mono">{{ duration }}</dd>
        </div>
        <div v-if="transit">
          <dt>Nearest</dt><dd>{{ transit }}</dd>
        </div>
      </dl>

      <p v-if="note" class="fe-note">
        <span class="fe-note-dot" aria-hidden="true"></span>{{ note }}
      </p>

      <footer class="fe-foot">
        <div class="fe-tags">
          <span v-for="t in tags" :key="t" class="fe-tag data-mono">{{ t }}</span>
        </div>
        <a
          v-if="maps"
          :href="maps"
          target="_blank" rel="noopener noreferrer"
          class="fe-map data-mono"
          @click="trackCTA('food_guide_maps', name, maps)"
        >Open in Maps →</a>
      </footer>
    </div>
  </article>
</template>

<style scoped>
/* An editorial entry, not a card. No box — a hairline rule above and an
   oversized numeral in the margin, the way a printed guide sets a list. */
.fe {
  display: grid;
  grid-template-columns: 74px minmax(0, 1fr);
  gap: 0 18px;
  padding: 30px 0 32px;
  border-top: 1px solid var(--hairline);
  position: relative;
}
@media (max-width: 560px) {
  .fe { grid-template-columns: 48px minmax(0, 1fr); gap: 0 12px; padding: 24px 0 26px; }
}

.fe-rank {
  font-size: clamp(2.6rem, 7vw, 3.6rem);
  line-height: 0.86;
  letter-spacing: -0.05em;
  color: var(--ink);
  opacity: 0.14;
  user-select: none;
  transition: opacity 0.25s, color 0.25s;
}
.fe:hover .fe-rank { opacity: 0.42; }
.fe-must .fe-rank { color: var(--orange-text); opacity: 0.55; }
.fe-gem  .fe-rank { color: var(--line-2); opacity: 0.4; }

.fe-body { min-width: 0; padding-top: 4px; }

.fe-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 14px;
}
.fe-name {
  font-size: clamp(1.15rem, 2.6vw, 1.5rem);
  line-height: 1.15;
  letter-spacing: -0.01em;
  color: var(--ink);
  margin: 0;
}
.fe-price {
  font-size: 14px;
  color: var(--orange-text);
  flex: none;
}

.fe-flags { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 9px; }
.fe-flag {
  font-size: 8.5px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  padding: 4px 10px;
  border-radius: 999px;
}
/* Stamped rather than tagged — these are the editor's calls */
.fe-flag-must {
  background: var(--signal);
  border: 1.5px solid var(--ink);
  color: var(--ink);
  font-weight: 700;
  transform: rotate(-2deg);
}
.fe-flag-gem {
  background: #fff;
  border: 1px dashed var(--line-2);
  color: #0E5F57;
}

.fe-insight {
  font-size: 15px;
  line-height: 1.72;
  color: var(--ink);
  margin: 13px 0 0;
  max-width: 62ch;
}

/* Timetable strip — mono values under mono labels */
.fe-data {
  display: flex;
  flex-wrap: wrap;
  gap: 14px 30px;
  margin: 18px 0 0;
  padding: 14px 0 0;
  border-top: 1px dashed var(--hairline);
}
.fe-data dt {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 8.5px;
  font-weight: 500;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 4px;
}
.fe-data dd {
  margin: 0;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--ink);
}

/* Transit note carries a station dot, matching the map markers */
.fe-note {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  font-size: 13px;
  line-height: 1.55;
  color: var(--muted);
  margin: 12px 0 0;
}
.fe-note-dot {
  width: 9px; height: 9px;
  border-radius: 50%;
  background: #fff;
  border: 3px solid var(--line-2);
  box-sizing: content-box;
  flex: none;
  margin-top: 4px;
}

.fe-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 16px;
}
.fe-tags { display: flex; gap: 5px; flex-wrap: wrap; }
.fe-tag {
  font-size: 8.5px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid var(--hairline);
  color: var(--muted);
}
.fe-map {
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--orange-text);
  text-decoration: none;
  white-space: nowrap;
  border-bottom: 1px solid transparent;
  transition: border-color 0.2s;
}
.fe-map:hover { border-bottom-color: var(--orange-text); }
</style>
