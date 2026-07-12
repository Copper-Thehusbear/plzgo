<script setup>
import { computed } from 'vue'
import { useTripStore } from '@/stores/useTripStore'

const props = defineProps({
  place: { type: Object, required: true },
  index: { type: Number, required: true },
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
  <div class="flex gap-4 items-start py-5 border-b border-slate-100 last:border-b-0">
    <!-- Number badge -->
    <div class="tl-number-badge">
      {{ index + 1 }}
    </div>

    <!-- Content -->
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2 mb-1">
        <span class="tl-time-tag">{{ place.time_tag }}</span>
        <span v-if="place.type" class="tl-type-tag">{{ place.type }}</span>
      </div>

      <h3 class="tl-name">{{ displayName }}</h3>

      <p class="tl-desc">{{ displayDesc }}</p>

      <!-- Meta info -->
      <div class="flex flex-wrap gap-x-3 gap-y-1 mt-2 mb-2 text-[11px] font-medium text-slate-400">
        <span v-if="place.zone_en || place.zone"><i class="fa-solid fa-location-dot mr-1"></i> {{ place.zone_en || place.zone }}</span>
        <span v-if="place.price_range"><i class="fa-solid fa-tag mr-1"></i> {{ place.price_range }}</span>
      </div>

      <a
        v-if="safeAffiliateLink"
        :href="safeAffiliateLink"
        target="_blank" rel="noopener"
        class="tl-link"
      >
        <i class="fa-solid fa-hotel mr-1.5"></i> Check rooms
      </a>

      <!-- Transit info -->
      <div v-if="place.nearest_transit_en || place.nearest_transit" class="tl-transit-box">
        <p class="font-bold text-blue-600">
          <i class="fa-solid fa-train-subway mr-1.5"></i> {{ place.nearest_transit_en || place.nearest_transit }}
        </p>
        <p v-if="place.transit_note_en" class="text-slate-400 mt-0.5 ml-5">
          {{ place.transit_note_en }}
        </p>
      </div>
    </div>

    <!-- Thumbnail -->
    <div class="relative flex-shrink-0">
      <img
        :src="place.image_url || `https://placehold.co/80x80/FF8C42/white?text=BKK`"
        :alt="place.name"
        class="w-20 h-20 rounded-2xl object-cover shadow-sm border border-white"
      />
    </div>
  </div>
</template>

<style scoped>
.tl-number-badge {
  width: 28px; height: 28px;
  border-radius: 50%;
  background: var(--navy);
  color: white;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 800;
  flex-shrink: 0; margin-top: 2px;
  box-shadow: 0 4px 10px rgba(30, 41, 59, 0.15);
}
.tl-time-tag {
  font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em;
  color: var(--orange);
}
.tl-type-tag {
  font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;
  color: #94A3B8; background: #F1F5F9; padding: 1px 6px; border-radius: 4px;
}
.tl-name {
  font-size: 16px; font-weight: 800; color: var(--navy);
  letter-spacing: -0.01em; line-height: 1.2;
}
.tl-desc {
  font-size: 13px; color: #64748B; line-height: 1.5; margin-top: 4px;
  display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
}
.tl-link {
  display: inline-flex; align-items: center;
  margin-top: 6px; font-size: 12px; font-weight: 700;
  color: var(--orange); text-decoration: none;
  background: rgba(255,140,66,0.1); padding: 5px 12px; border-radius: 99px;
  transition: all 0.2s;
}
.tl-link:hover { background: var(--orange); color: white; transform: translateY(-1px); }

.tl-transit-box {
  margin-top: 10px; padding: 10px 12px;
  background: rgba(59,130,246,0.06); border-radius: 14px;
  font-size: 11px; line-height: 1.4;
}
</style>
