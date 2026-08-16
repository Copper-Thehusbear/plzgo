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
        class="touch-none select-none ctx-sheet-inner"
        style="pointer-events:all;overflow:hidden;height:82vh;"
        :style="cardStyle"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerCancel"
      >
        <!-- Drag handle -->
        <div class="ctx-drag-handle">
          <div style="width:36px;height:4px;border-radius:2px;background:var(--hairline);" />
        </div>

        <!-- Header -->
        <div class="flex items-center gap-2 px-5 mb-3">
          <span class="ctx-nearby-badge data-mono"><span class="ctx-signal-dot" aria-hidden="true"></span> Unmarked stop</span>
          <span v-if="walkMinutes" class="data-mono" style="font-size:10px;color:var(--muted)">
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
          <div v-else class="w-full h-full flex items-center justify-center" style="background:var(--paper)">
            <i class="fa-solid fa-location-dot text-3xl" style="color:var(--hairline)"></i>
          </div>

          <!-- Stamps -->
          <Transition name="ctx-stamp">
            <div v-if="showYep" class="ctx-stamp yep data-mono">BOARD</div>
          </Transition>
          <Transition name="ctx-stamp">
            <div v-if="showNope" class="ctx-stamp nope data-mono">SKIP</div>
          </Transition>
        </div>

        <!-- Info -->
        <div class="p-5 flex-1 overflow-hidden">
          <h2 class="text-xl leading-tight mb-2 display-cond" style="color:var(--ink)">
            {{ displayName }}
          </h2>
          <p class="text-[13px] leading-relaxed line-clamp-4" style="color:var(--muted)">
            {{ displayDesc }}
          </p>
          <div class="flex flex-wrap gap-2 mt-4">
            <span v-if="place.price_range" class="ctx-meta-pill data-mono">
              {{ place.price_range }}
            </span>
            <span v-if="durationLabel" class="ctx-meta-pill data-mono">
              {{ durationLabel }}
            </span>
          </div>
        </div>

        <!-- Buttons -->
        <div class="ctx-actions">
          <button
            @click.stop="triggerExit(-1,'nope')"
            class="ctx-btn nope"
            aria-label="Skip stop"
          >
            <i class="fa-solid fa-xmark"></i>
          </button>
          <button
            @click.stop="triggerExit(1,'yep')"
            class="ctx-btn yep"
            aria-label="Board"
          >
            <i class="fa-solid fa-plus"></i>
          </button>
        </div>

        <p class="ctx-footer data-mono">
          Add to line?
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ctx-backdrop {
  position: absolute; inset: 0; background: rgba(28,39,61,0.5);
}
.ctx-sheet-wrapper {
  position: absolute; inset: 0; display: flex; align-items: flex-end; pointer-events: none;
}
/* Unmarked stop sheet — white paper, dashed signal border */
.ctx-sheet-inner {
  background: #fff;
  border: 1px dashed var(--signal);
  border-bottom: none;
  border-radius: 8px 8px 0 0;
  display: flex; flex-direction: column;
  animation: ctx-slide-up 0.4s cubic-bezier(0.32, 0.72, 0, 1) both;
}
.ctx-drag-handle {
  display: flex; justify-content: center; padding: 12px 0;
}
.ctx-signal-dot {
  display: inline-block;
  width: 10px; height: 10px; border-radius: 50%;
  background: var(--signal); border: 2px solid var(--ink);
  vertical-align: -1px; margin-right: 2px;
}
/* "Post-it" note treatment — this badge announces an off-plan suggestion,
   so it gets to look like a little note stuck on, tape and all. Tape uses
   --signal (the existing unmarked-stop color) at low opacity, not a new
   off-system color. */
.ctx-nearby-badge {
  font-size: 10px; text-transform: uppercase;
  padding: 4px 12px; border-radius: 999px;
  background: #fff; border: 1px dashed var(--signal); color: var(--ink);
  display: inline-flex; align-items: center; gap: 5px;
  position: relative;
  box-shadow: var(--shadow-md);
  transform: rotate(-3deg);
}
.ctx-nearby-badge::before,
.ctx-nearby-badge::after {
  content: '';
  position: absolute;
  width: 26px; height: 11px;
  background: rgba(255,210,53,0.6);
  border-radius: 2px;
}
.ctx-nearby-badge::before { top: -7px; left: 10px; transform: rotate(-5deg); }
.ctx-nearby-badge::after  { top: -6px; right: 12px; transform: rotate(6deg); background: rgba(255,210,53,0.45); }
.ctx-meta-pill {
  font-size: 11px; padding: 4px 12px; border-radius: 999px;
  background: #fff; border: 1px solid var(--hairline); color: var(--muted);
}

.ctx-actions {
  display: flex; justify-content: center; gap: 40px;
  padding: 20px;
  border-top: 1px solid var(--hairline);
  background: #fff;
}
.ctx-btn {
  width: 60px; height: 60px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 22px; cursor: pointer;
  transition: transform 0.15s ease-out, box-shadow 0.15s ease-out;
}
.ctx-btn.nope { background: #fff; color: var(--muted); border: 1px solid var(--hairline); }
.ctx-btn.yep  { background: var(--ink); color: #fff; border: 1px solid var(--ink); }
.ctx-btn:hover  { transform: translateY(-2px); box-shadow: var(--shadow-md); }
.ctx-btn:active { transform: translateY(1px); box-shadow: none; }

.ctx-footer {
  text-align: center;
  font-size: 10px; text-transform: uppercase;
  color: var(--muted);
  padding-bottom: 24px; margin: 0;
}

/* Rubber stamps — station-sign style, system colors */
.ctx-stamp {
  position: absolute; top: 50%; transform: translateY(-50%);
  font-size: 28px; padding: 6px 20px; border-radius: 8px; border: 4px solid;
  background: rgba(255,255,255,0.9);
  z-index: 50; pointer-events: none;
}
.ctx-stamp.yep  { left: 16px; color: var(--line-2); border-color: var(--line-2); transform: translateY(-50%) rotate(-15deg); }
.ctx-stamp.nope { right: 16px; color: var(--ink); border-color: var(--ink); transform: translateY(-50%) rotate(15deg); }

.ctx-stamp-enter-active { transition: all 0.15s ease; }
.ctx-stamp-enter-from { opacity: 0; transform: translateY(-50%) scale(1.3); }

@keyframes ctx-slide-up {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}

@media (min-width: 768px) {
  .ctx-sheet-wrapper { justify-content: flex-end; align-items: center; padding-right: 40px; }
  .ctx-sheet-inner { width: 400px; height: 80vh !important; border-radius: 8px !important; border-bottom: 1px dashed var(--signal); }
}
</style>
