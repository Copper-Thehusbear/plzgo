<script setup>
import { ref, computed } from 'vue'
import { useTripStore } from '@/stores/useTripStore'

const props = defineProps({
  place:       { type: Object, required: true },
  walkMinutes: { type: Number, default: null },
  nearestName: { type: String, default: null },
})
const emit = defineEmits(['yep', 'nope'])

const store = useTripStore()

const dragX      = ref(0)
const isDragging = ref(false)
const isExiting  = ref(false)
const exitDir    = ref(0)
const startX     = ref(0)
const THRESHOLD  = 80

const cardStyle = computed(() => ({
  transform: isExiting.value
    ? `translateX(${exitDir.value * (window.innerWidth + 300)}px) rotate(${exitDir.value * 28}deg)`
    : `translateX(${dragX.value}px) rotate(${dragX.value * 0.05}deg)`,
  transition: isDragging.value
    ? 'none'
    : 'transform 0.42s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  willChange: 'transform',
}))

const dragProg = computed(() => Math.min(Math.abs(dragX.value) / THRESHOLD, 1))
const showYep  = computed(() => dragX.value > 20)
const showNope = computed(() => dragX.value < -20)

function onPointerDown(e) {
  if (isExiting.value) return
  isDragging.value = true
  startX.value = e.clientX
  e.currentTarget.setPointerCapture(e.pointerId)
}
function onPointerMove(e) {
  if (!isDragging.value) return
  dragX.value = e.clientX - startX.value
}
function onPointerUp() {
  if (!isDragging.value) return
  isDragging.value = false
  if      (dragX.value >  THRESHOLD) triggerExit( 1, 'yep')
  else if (dragX.value < -THRESHOLD) triggerExit(-1, 'nope')
  else dragX.value = 0
}
function onPointerCancel() {
  isDragging.value = false
  dragX.value = 0
}

function triggerExit(dir, event) {
  if (isExiting.value) return
  isExiting.value = true
  exitDir.value   = dir
  dragX.value     = 0
  setTimeout(() => emit(event), 430)
}

const displayName = computed(() =>
  store.lang === 'th' ? props.place.name : (props.place.name_en || props.place.name)
)
const displayDesc = computed(() =>
  store.lang === 'th'
    ? (props.place.description || props.place.description_tourist)
    : props.place.description_tourist
)
const image = computed(() =>
  props.place.images?.[0] || props.place.image_url || null
)
const durationLabel = computed(() => {
  const m = props.place.duration_minutes
  if (!m) return null
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60), r = m % 60
  return r ? `${h}h ${r}m` : `${h}h`
})
</script>

<template>
  <div class="fixed inset-y-0 left-1/2 -translate-x-1/2 w-full max-w-[500px] z-[100] overflow-hidden">
    <!-- Backdrop -->
    <div class="ctx-backdrop" @click="triggerExit(-1,'nope')" />

    <!-- Sheet -->
    <div class="ctx-sheet-wrapper">
      <div
        class="touch-none select-none ctx-sheet-inner glass-panel"
        style="pointer-events:all;overflow:hidden;height:82vh;border-radius:24px 24px 0 0;"
        :style="cardStyle"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerCancel"
      >
        <!-- Drag handle -->
        <div class="ctx-drag-handle">
          <div style="width:36px;height:4px;border-radius:2px;background:rgba(0,0,0,0.1);" />
        </div>

        <!-- Header -->
        <div class="flex items-center gap-2 px-5 mb-3">
          <span class="ctx-nearby-badge">✦ Nearby Spot</span>
          <span v-if="walkMinutes" class="text-[10px] font-bold text-slate-400">
            ~{{ walkMinutes }} min walk
          </span>
        </div>

        <!-- Image -->
        <div class="relative h-[35%] overflow-hidden flex-shrink-0">
          <img
            v-if="image"
            :src="image"
            :alt="displayName"
            class="w-full h-full object-cover"
            draggable="false"
          />
          <div v-else class="w-full h-full bg-slate-100 flex items-center justify-center">
            <i class="fa-solid fa-location-dot text-slate-300 text-3xl"></i>
          </div>
          <div class="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/20 to-transparent"></div>

          <!-- Stamps -->
          <Transition name="ctx-stamp">
            <div v-if="showYep" class="ctx-stamp yep">YEP</div>
          </Transition>
          <Transition name="ctx-stamp">
            <div v-if="showNope" class="ctx-stamp nope">NOPE</div>
          </Transition>
        </div>

        <!-- Info -->
        <div class="p-5 flex-1 overflow-hidden">
          <h2 class="text-xl font-black text-slate-900 leading-tight mb-2">
            {{ displayName }}
          </h2>
          <p class="text-[13px] text-slate-600 leading-relaxed line-clamp-4">
            {{ displayDesc }}
          </p>
          <div class="flex flex-wrap gap-2 mt-4">
            <span v-if="place.price_range" class="ctx-meta-pill bg-orange-50 text-orange-600">
              <i class="fa-solid fa-tag mr-1"></i> {{ place.price_range }}
            </span>
            <span v-if="durationLabel" class="ctx-meta-pill bg-slate-100 text-slate-600">
              <i class="fa-solid fa-clock mr-1"></i> {{ durationLabel }}
            </span>
          </div>
        </div>

        <!-- Buttons -->
        <div class="flex justify-center gap-10 py-6 px-5 border-t border-slate-100/50 bg-white/30">
          <button
            @click.stop="triggerExit(-1,'nope')"
            class="ctx-btn nope"
            aria-label="Skip"
          >
            <i class="fa-solid fa-xmark"></i>
          </button>
          <button
            @click.stop="triggerExit(1,'yep')"
            class="ctx-btn yep"
            aria-label="Add"
          >
            <i class="fa-solid fa-plus"></i>
          </button>
        </div>

        <p class="text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest pb-6">
          Swipe to decide
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ctx-backdrop {
  position: absolute; inset: 0; background: rgba(30,41,59,0.4); backdrop-filter: blur(4px);
}
.ctx-sheet-wrapper {
  position: absolute; inset: 0; display: flex; align-items: flex-end; pointer-events: none;
}
.ctx-drag-handle {
  display: flex; justify-content: center; padding: 12px 0;
}
.ctx-nearby-badge {
  font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em;
  padding: 4px 12px; border-radius: 99px;
  background: rgba(255,210,50,0.15); border: 1px solid rgba(255,210,50,0.4); color: #B45309;
}
.ctx-meta-pill {
  font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 99px;
}

.ctx-btn {
  width: 60px; height: 60px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 22px; cursor: pointer; border: none; transition: all 0.2s;
}
.ctx-btn.nope { background: #fff; color: #EF4444; border: 1.5px solid #FEE2E2; box-shadow: 0 4px 12px rgba(239,68,68,0.15); }
.ctx-btn.yep  { background: var(--orange); color: #fff; box-shadow: 0 4px 12px rgba(255,140,66,0.35); }
.ctx-btn:active { transform: scale(0.9); }

.ctx-stamp {
  position: absolute; top: 50%; transform: translateY(-50%);
  font-size: 32px; font-weight: 900; padding: 6px 20px; border-radius: 12px; border: 5px solid;
  z-index: 50; pointer-events: none;
}
.ctx-stamp.yep  { left: 16px; color: #34C759; border-color: #34C759; transform: translateY(-50%) rotate(-15deg); }
.ctx-stamp.nope { right: 16px; color: #EF4444; border-color: #EF4444; transform: translateY(-50%) rotate(15deg); }

.ctx-stamp-enter-active { transition: all 0.15s ease; }
.ctx-stamp-enter-from { opacity: 0; transform: translateY(-50%) scale(1.3); }

/* Animation for sheet entry */
.ctx-sheet-inner {
  animation: ctx-slide-up 0.4s cubic-bezier(0.32, 0.72, 0, 1) both;
}
@keyframes ctx-slide-up {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}

@media (min-width: 768px) {
  .ctx-sheet-wrapper { justify-content: flex-end; align-items: center; padding-right: 40px; }
  .ctx-sheet-inner { width: 400px; height: 80vh !important; border-radius: 28px !important; }
}
</style>
