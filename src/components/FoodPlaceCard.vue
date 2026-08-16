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
</script>

<template>
  <article class="fp-card">
    <div class="fp-head">
      <span class="fp-num data-mono">{{ String(index + 1).padStart(2, '0') }}</span>
      <div class="fp-title-wrap">
        <h3 class="fp-name display-cond">{{ name }}</h3>
        <div class="fp-badges">
          <span v-if="place.is_universal" class="fp-badge fp-badge-must data-mono">Must-eat</span>
          <span v-if="place.is_hidden_gem" class="fp-badge fp-badge-gem data-mono">Hidden gem</span>
        </div>
      </div>
      <span v-if="place.price_range" class="fp-price data-mono">{{ place.price_range }}</span>
    </div>

    <!-- The insight is the whole reason this page is worth reading -->
    <p v-if="place.insight_en" class="fp-insight">{{ place.insight_en }}</p>

    <dl class="fp-meta">
      <div v-if="hours">
        <dt>Hours</dt>
        <dd class="data-mono">{{ hours }}</dd>
      </div>
      <div v-if="duration">
        <dt>Allow</dt>
        <dd class="data-mono">{{ duration }}</dd>
      </div>
      <div v-if="transit">
        <dt>Nearest</dt>
        <dd>{{ transit }}</dd>
      </div>
    </dl>

    <p v-if="note" class="fp-note">
      <i class="fa-solid fa-train-subway"></i> {{ note }}
    </p>

    <div class="fp-foot">
      <div class="fp-tags">
        <span v-for="t in tags" :key="t" class="fp-tag data-mono">{{ t }}</span>
      </div>
      <a
        v-if="maps"
        :href="maps"
        target="_blank" rel="noopener noreferrer"
        class="fp-map"
        @click="trackCTA('food_guide_maps', name, maps)"
      >Open in Maps →</a>
    </div>
  </article>
</template>

<style scoped>
.fp-card {
  position: relative;
  background: #fff;
  border: 1px solid var(--hairline);
  border-radius: 8px;
  padding: 22px 22px 18px;
  box-shadow: var(--shadow-sm);
  transition: transform 0.25s ease-out, box-shadow 0.25s ease-out;
}
.fp-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-md); }

.fp-head { display: flex; align-items: flex-start; gap: 12px; }
.fp-num {
  font-size: 12px;
  color: var(--orange-text);
  padding-top: 4px;
  flex: none;
}
.fp-title-wrap { flex: 1; min-width: 0; }
.fp-name {
  font-size: 19px;
  line-height: 1.2;
  color: var(--ink);
  margin: 0;
}
.fp-badges { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px; }
.fp-badge {
  font-size: 9px;
  text-transform: uppercase;
  padding: 3px 9px;
  border-radius: 999px;
}
.fp-badge-must { background: var(--signal); border: 1px solid var(--ink); color: var(--ink); }
.fp-badge-gem  { background: #fff; border: 1px dashed var(--signal); color: var(--ink); }
.fp-price {
  font-size: 14px;
  color: var(--ink);
  flex: none;
  padding-top: 2px;
}

.fp-insight {
  font-size: 14px;
  line-height: 1.65;
  color: var(--ink);
  margin: 14px 0 0;
}

.fp-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 18px 26px;
  margin: 16px 0 0;
  padding-top: 14px;
  border-top: 1px dashed var(--hairline);
}
.fp-meta dt {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 3px;
}
.fp-meta dd {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
}

.fp-note {
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--muted);
  margin: 12px 0 0;
}
.fp-note i { color: var(--line-2); margin-right: 5px; }

.fp-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 16px;
}
.fp-tags { display: flex; gap: 5px; flex-wrap: wrap; }
.fp-tag {
  font-size: 9px;
  text-transform: uppercase;
  padding: 3px 9px;
  border-radius: 999px;
  border: 1px solid var(--hairline);
  color: var(--muted);
}
.fp-map {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--orange-text);
  text-decoration: none;
  white-space: nowrap;
}
.fp-map:hover { text-decoration: underline; }
</style>
