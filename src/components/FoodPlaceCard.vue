<script setup>
import { computed } from 'vue'
import { displayName, mapsUrl, durationLabel, bandOf } from '@/composables/useFoodGuide'
import { trackCTA } from '@/composables/useAnalytics'

const props = defineProps({
  place:      { type: Object, required: true },
  highlight:  { type: Boolean, default: false },
})

const name     = computed(() => displayName(props.place))
const maps     = computed(() => mapsUrl(props.place))
const duration = computed(() => durationLabel(props.place))
const hours    = computed(() => props.place.opening_hours_en || props.place.opening_hours || null)
const transit  = computed(() => props.place.nearest_transit_en || props.place.nearest_transit || null)
const band     = computed(() => bandOf(props.place))
const tags     = computed(() => (props.place.vibe_tags || []).slice(0, 2))
</script>

<template>
  <article
    class="fc"
    :class="{ 'fc-hit': highlight }"
    :style="{ '--accent': band?.color || 'var(--muted)' }"
  >
    <!-- Colour is the card's only visual identity while every photo 403s,
         so it has to mean something: it encodes the price band. -->
    <div class="fc-spine" aria-hidden="true"></div>

    <div class="fc-in">
      <header class="fc-top">
        <h3 class="fc-name display-cond">{{ name }}</h3>
        <span v-if="place.price_range" class="fc-band data-mono">{{ place.price_range }}</span>
      </header>

      <p v-if="place.zone_en || place.zone" class="fc-zone data-mono">
        {{ place.zone_en || place.zone }}
      </p>

      <p v-if="place.insight_en" class="fc-insight">{{ place.insight_en }}</p>

      <div v-if="place.is_universal || place.is_hidden_gem" class="fc-flags">
        <span v-if="place.is_universal" class="fc-flag fc-flag-must data-mono">Must eat</span>
        <span v-if="place.is_hidden_gem" class="fc-flag fc-flag-gem data-mono">Hidden gem</span>
      </div>

      <dl class="fc-meta">
        <div v-if="hours">
          <dt>Hours</dt><dd class="data-mono">{{ hours }}</dd>
        </div>
        <div v-if="duration">
          <dt>Allow</dt><dd class="data-mono">{{ duration }}</dd>
        </div>
      </dl>

      <p v-if="transit" class="fc-transit">
        <span class="fc-dot" aria-hidden="true"></span>{{ transit }}
      </p>

      <footer class="fc-foot">
        <div class="fc-tags">
          <span v-for="t in tags" :key="t" class="fc-tag data-mono">{{ t }}</span>
        </div>
        <a
          v-if="maps"
          :href="maps"
          target="_blank" rel="noopener noreferrer"
          class="fc-map data-mono"
          @click="trackCTA('food_guide_maps', name, maps)"
        >Map →</a>
      </footer>
    </div>
  </article>
</template>

<style scoped>
.fc {
  position: relative;
  display: flex;
  background: #fff;
  border: 1px solid var(--hairline);
  border-radius: 10px;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  transition: transform 0.25s ease-out, box-shadow 0.25s ease-out, border-color 0.15s;
}
.fc:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
  border-color: var(--ink);
}
/* Flagged by "Pick for me" */
.fc-hit {
  border-color: var(--accent);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent) 22%, transparent), var(--shadow-lift);
  transform: translateY(-4px);
}

.fc-spine {
  width: 6px;
  flex: none;
  background: var(--accent);
}

.fc-in {
  flex: 1;
  min-width: 0;
  padding: 18px 20px 16px;
  display: flex;
  flex-direction: column;
}

.fc-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.fc-name {
  font-size: 17px;
  line-height: 1.25;
  letter-spacing: -0.005em;
  color: var(--ink);
  margin: 0;
}
.fc-band {
  flex: none;
  font-size: 12px;
  color: var(--accent);
  padding-top: 2px;
}

.fc-zone {
  font-size: 9px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
  margin: 6px 0 0;
}

.fc-insight {
  font-size: 13.5px;
  line-height: 1.6;
  color: var(--muted);
  margin: 11px 0 0;
  /* Cards in a grid must agree on height or the row ragged-edges badly */
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.fc-flags { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 11px; }
.fc-flag {
  font-size: 8px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  padding: 4px 9px;
  border-radius: 999px;
}
.fc-flag-must { background: var(--signal); border: 1px solid var(--ink); color: var(--ink); font-weight: 700; }
.fc-flag-gem  { background: #fff; border: 1px dashed var(--line-2); color: #0E5F57; }

.fc-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 22px;
  margin: 14px 0 0;
  padding-top: 12px;
  border-top: 1px dashed var(--hairline);
}
.fc-meta dt {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 8px;
  font-weight: 500;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 3px;
}
.fc-meta dd {
  margin: 0;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--ink);
}

.fc-transit {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12px;
  line-height: 1.45;
  color: var(--muted);
  margin: 10px 0 0;
}
.fc-dot {
  width: 7px; height: 7px;
  border-radius: 50%;
  background: #fff;
  border: 2.5px solid var(--line-2);
  box-sizing: content-box;
  flex: none;
  margin-top: 3px;
}

.fc-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: auto;
  padding-top: 14px;
}
.fc-tags { display: flex; gap: 5px; flex-wrap: wrap; min-width: 0; }
.fc-tag {
  font-size: 8px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid var(--hairline);
  color: var(--muted);
}
.fc-map {
  flex: none;
  font-size: 9.5px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--orange-text);
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: border-color 0.2s;
}
.fc-map:hover { border-bottom-color: var(--orange-text); }
</style>
