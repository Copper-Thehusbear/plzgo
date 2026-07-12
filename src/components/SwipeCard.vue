<script setup>
import { ref, computed, watch } from 'vue'
import { useTripStore } from '@/stores/useTripStore'

const props = defineProps({
  place:     { type: Object,  required: true },
  isTop:     { type: Boolean, default: false },
  yepCount:  { type: Number,  default: 0 },
  remaining: { type: Number,  default: 0 },
})
const emit = defineEmits(['yep', 'nope', 'drag-progress'])

// ── Swipe gesture — Physics Spec v2 ─────────────────────────────────
// Feel = follow the finger instantly / respect momentum / spring back.
const dragX        = ref(0)
const dragY        = ref(0)   // raw dy — damped ×0.35 at render time
const isDragging   = ref(false)
const isExiting    = ref(false)
const exitDir      = ref(0)
const startX       = ref(0)
const startY       = ref(0)
const gestureLock  = ref(null) // 'h' | 'v' | null
const LOCK_TOL     = 8

const cardRef = ref(null)

// Non-reactive physics state: written every pointermove — keeping it out of
// Vue reactivity keeps the hot path to two ref writes per frame.
let moveHistory = []   // recent {x, y, t}, trimmed to a ~100ms window
let grabFactor  = 1    // +1 grabbed top half, −1 bottom half (real-card torque)
let cardWidth   = 320  // measured once at pointerdown

const exitX        = ref(0)
const exitY        = ref(0)
const exitRot      = ref(0)
const exitDuration = ref(400)

const reducedMotion = typeof window !== 'undefined'
  && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// Exit keeps release speed (linear-out); snap-back overshoots (spring).
// These two must never share an easing — different emotions.
const EXIT_EASE   = 'cubic-bezier(0.17, 0.67, 0.35, 1)'
const SPRING_EASE = 'cubic-bezier(0.175, 0.885, 0.32, 1.15)'

const cardStyle = computed(() => {
  if (isExiting.value) {
    if (reducedMotion) {
      return {
        transform:  `translateX(${exitDir.value * 40}px)`,
        opacity:    0,
        transition: 'transform 150ms ease-out, opacity 150ms ease-out',
        willChange: 'transform',
      }
    }
    return {
      transform:  `translate(${exitX.value}px, ${exitY.value}px) rotate(${exitRot.value}deg)`,
      transition: `transform ${exitDuration.value}ms ${EXIT_EASE}`,
      willChange: 'transform',
    }
  }
  if (isDragging.value && gestureLock.value === 'h') {
    const rot = reducedMotion ? 0 : (dragX.value / cardWidth) * 14 * grabFactor
    return {
      transform:  `translate(${dragX.value}px, ${dragY.value * 0.35}px) rotate(${rot}deg)`,
      transition: 'none',
      willChange: 'transform',
    }
  }
  return {
    transform:  'translate(0px, 0px) rotate(0deg)',
    transition: reducedMotion ? 'transform 150ms ease-out' : `transform 300ms ${SPRING_EASE}`,
    willChange: 'transform',
  }
})

// Commit distance is relative to card width, not a fixed pixel count.
const dragProgress = computed(() =>
  isExiting.value ? 1 : Math.min(Math.abs(dragX.value) / (0.28 * cardWidth), 1))
const showYep      = computed(() => dragX.value > 14 || (isExiting.value && exitDir.value === 1))
const showNope     = computed(() => dragX.value < -14 || (isExiting.value && exitDir.value === -1))

// Deck breathing: the back card scales with the top card's progress.
watch(dragProgress, v => { if (props.isTop) emit('drag-progress', v) })

// ── Multi-image state ───────────────────────────────────────────────
const imgIndex     = ref(0)
const imageAreaRef = ref(null)
const scrollRef    = ref(null)

const images = computed(() =>
  props.place.images?.length
    ? props.place.images
    : props.place.image_url
      ? [props.place.image_url]
      : []
)

// URLs that failed to load → show the placeholder instead of a broken img.
// The failing src is read from the element's data-src (bound at render time),
// so a late error event from a previous image can't mark the current one.
const failedImages = ref(new Set())
function onImageError(e) {
  const src = e.target?.dataset?.src
  if (src) failedImages.value.add(src)
}
const currentImageOk = computed(() =>
  images.value.length > 0 && !failedImages.value.has(images.value[imgIndex.value])
)

watch(() => props.place.id, () => {
  imgIndex.value = 0
  failedImages.value.clear()
  if (scrollRef.value) scrollRef.value.scrollTop = 0
})

function prevImage() { if (imgIndex.value > 0) imgIndex.value-- }
function nextImage() { if (imgIndex.value < images.value.length - 1) imgIndex.value++ }

// ── Pointer handlers (with horizontal/vertical lock) ────────────────
let tapStartX = 0
let tapStartY = 0
let isTap = false

function onPointerDown(e) {
  if (!props.isTop || isExiting.value) return
  // Skip if the touch originated on a button/link
  if (e.target.closest('button, a')) return
  isDragging.value = true
  startX.value = e.clientX
  startY.value = e.clientY
  gestureLock.value = null
  const rect = e.currentTarget.getBoundingClientRect()
  cardWidth  = rect.width || 320
  grabFactor = e.clientY < rect.top + rect.height / 2 ? 1 : -1
  moveHistory = [{ x: e.clientX, y: e.clientY, t: e.timeStamp }]
  try { e.currentTarget.setPointerCapture(e.pointerId) } catch {}
  tapStartX = e.clientX
  tapStartY = e.clientY
  isTap = true
}

function onPointerMove(e) {
  if (!isDragging.value) return
  const dx = e.clientX - startX.value
  const dy = e.clientY - startY.value

  // Lock direction once movement exceeds threshold
  if (gestureLock.value === null) {
    if (Math.abs(dx) < LOCK_TOL && Math.abs(dy) < LOCK_TOL) return
    // Bias toward vertical (1.3x) — accidental horizontal flicks while scrolling shouldn't swipe
    if (Math.abs(dx) > Math.abs(dy) * 1.3) {
      gestureLock.value = 'h'
    } else {
      gestureLock.value = 'v'
      isTap = false // scrolling is not a tap — don't flip the image on release
      try { e.currentTarget.releasePointerCapture(e.pointerId) } catch {}
      isDragging.value = false
      return
    }
  }

  if (Math.abs(dx) > LOCK_TOL || Math.abs(dy) > LOCK_TOL) isTap = false

  if (gestureLock.value === 'h') {
    dragX.value = dx
    dragY.value = dy
    // Velocity window: keep only samples from the last 100ms (max 5)
    moveHistory.push({ x: e.clientX, y: e.clientY, t: e.timeStamp })
    while (moveHistory.length > 5 || (moveHistory.length > 1 && e.timeStamp - moveHistory[0].t > 100)) {
      moveHistory.shift()
    }
  }
}

// px/ms across the sample window at release
function releaseVelocity() {
  if (moveHistory.length < 2) return 0
  const first = moveHistory[0]
  const last  = moveHistory[moveHistory.length - 1]
  const dt = last.t - first.t
  return dt > 0 ? (last.x - first.x) / dt : 0
}

function onPointerUp(e) {
  if (!isDragging.value && gestureLock.value !== 'h' && !isTap) return
  isDragging.value = false

  // Tap on image area → cycle images
  if (isTap && imageAreaRef.value && images.value.length > 0) {
    const rect = imageAreaRef.value.getBoundingClientRect()
    if (tapStartY >= rect.top && tapStartY <= rect.bottom) {
      dragX.value = 0
      const mid = rect.left + rect.width / 2
      if (tapStartX < mid) prevImage()
      else nextImage()
      return
    }
  }

  // Swipe completion — commit on distance OR a short fast flick
  if (gestureLock.value === 'h') {
    const vx = releaseVelocity()
    const dir = dragX.value !== 0 ? Math.sign(dragX.value) : Math.sign(vx)
    const byDistance = Math.abs(dragX.value) > 0.28 * cardWidth
    const byFlick    = Math.abs(vx) > 0.55 && Math.sign(vx) === dir && dir !== 0
    if (dir !== 0 && (byDistance || byFlick)) {
      triggerExit(dir, dir > 0 ? 'yep' : 'nope', vx)
    } else {
      dragX.value = 0
      dragY.value = 0
    }
  }
}

function onPointerCancel() {
  isDragging.value = false
  isTap = false // a cancelled gesture must never register as a tap
  moveHistory = []
  if (gestureLock.value !== 'v') { dragX.value = 0; dragY.value = 0 }
}

function triggerExit(dir, event, vx = 0) {
  if (isExiting.value) return
  const fromX    = dragX.value
  const targetX  = dir * (window.innerWidth + 100)
  const remaining = Math.abs(targetX - fromX)
  // Faster release = shorter flight; button-triggered exits get the full 400ms
  const duration = reducedMotion
    ? 150
    : Math.round(Math.min(400, Math.max(200, remaining / Math.max(Math.abs(vx), 1.2))))

  // Continue along the drag vector (damped y, extrapolated + capped)
  const dampedY = dragY.value * 0.35
  exitX.value = targetX
  exitY.value = fromX !== 0
    ? Math.max(-160, Math.min(160, dampedY * (targetX / fromX)))
    : dampedY
  exitRot.value = Math.max(-22, Math.min(22, (targetX / cardWidth) * 14 * grabFactor))
  exitDuration.value = duration

  isExiting.value = true
  exitDir.value   = dir

  // Emit on transitionend; setTimeout is only the fallback (background tabs
  // may never fire the event).
  let done = false
  const finish = () => { if (!done) { done = true; emit(event) } }
  cardRef.value?.addEventListener('transitionend', finish, { once: true })
  setTimeout(finish, duration + 80)
}
defineExpose({ triggerExit })

// ── Language-aware display ──────────────────────────────────────────
const store = useTripStore()

const displayName = computed(() =>
  store.lang === 'th' ? props.place.name : (props.place.name_en || props.place.name)
)
const subName = computed(() =>
  store.lang === 'th' ? (props.place.name_en || null) : null
)
const displayDesc = computed(() =>
  store.lang === 'th'
    ? (props.place.description || props.place.insight_th || props.place.description_tourist)
    : (props.place.description_tourist || props.place.insight_en || props.place.description)
)

// ── Display helpers ─────────────────────────────────────────────────
const displayPrice = computed(() => {
  const { price_range, price_avg_thb } = props.place
  if (!price_range && !price_avg_thb) return null
  if (price_avg_thb === 0) return 'Free'
  if (price_avg_thb && price_range) return `${price_range} · ${price_avg_thb.toLocaleString()}฿`
  if (price_avg_thb) return `${price_avg_thb.toLocaleString()}฿`
  return price_range
})

const displayDuration = computed(() => {
  const mins = props.place.duration_minutes ?? props.place.duration_min
  if (!mins) return null
  if (mins < 60) return `${mins} min`
  if (mins % 60 === 0) return `${mins / 60} hr`
  return `${Math.floor(mins / 60)} hr ${mins % 60} min`
})

const displayHours = computed(() => {
  const h = props.place.opening_hours
  if (!h) return null
  if (props.place.type === 'hotel') return '24 hrs'
  return h
})

const transit = computed(() => {
  const station = props.place.nearest_transit_en || props.place.nearest_transit
  const note = props.place.transit_note_en || props.place.transit_note
  if (!station) return null
  return { station, note }
})

const VIBE_STYLES = {
  foodie:    { bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.35)',  color: '#B45309' },
  chill:     { bg: 'rgba(20,184,166,0.12)',  border: 'rgba(20,184,166,0.35)',  color: '#0F766E' },
  photo:     { bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.35)', color: '#7C3AED' },
  spiritual: { bg: 'rgba(244,114,182,0.12)', border: 'rgba(244,114,182,0.35)', color: '#BE185D' },
  party:     { bg: 'rgba(251,113,133,0.12)', border: 'rgba(251,113,133,0.35)', color: '#BE123C' },
  luxury:    { bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.35)',  color: '#B45309' },
  'gay-vibe':{ bg: 'rgba(244,114,182,0.12)', border: 'rgba(244,114,182,0.35)', color: '#BE185D' },
  wellness:  { bg: 'rgba(244,114,182,0.12)', border: 'rgba(244,114,182,0.35)', color: '#BE185D' },
  budget:    { bg: 'rgba(74,222,128,0.12)',  border: 'rgba(74,222,128,0.35)',  color: '#15803D' },
  shopping:  { bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.35)',  color: '#2563EB' },
  adventure: { bg: 'rgba(251,146,60,0.12)',  border: 'rgba(251,146,60,0.35)',  color: '#C2410C' },
  local:     { bg: 'rgba(30,41,59,0.06)',    border: 'rgba(30,41,59,0.15)',    color: 'rgba(30,41,59,0.6)' },
}
const DEFAULT_VIBE = { bg: 'rgba(30,41,59,0.06)', border: 'rgba(30,41,59,0.15)', color: 'rgba(30,41,59,0.5)' }
function vibeStyle(tag) { return VIBE_STYLES[tag] ?? DEFAULT_VIBE }

const footerLocation = computed(() =>
  [props.place.zone_en || props.place.zone, props.place.city].filter(Boolean).join(' · ')
)
</script>

<template>
  <div
    ref="cardRef"
    class="sc-card"
    :style="isTop ? cardStyle : {}"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerCancel"
  >
    <!-- ── Scrollable content ──────────────────────────────── -->
    <div ref="scrollRef" class="sc-scroll">

      <!-- IMAGE -->
      <div ref="imageAreaRef" class="sc-image-area">
        <img
          v-if="currentImageOk"
          :key="place.id + '-' + imgIndex"
          :src="images[imgIndex]"
          :data-src="images[imgIndex]"
          :alt="displayName"
          class="sc-image"
          draggable="false"
          @error="onImageError"
        />
        <div v-else class="sc-image-placeholder">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
              stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="12" cy="13" r="4" stroke="white" stroke-width="1.5"/>
          </svg>
          <span class="sc-placeholder-label">{{ place.type || 'place' }}</span>
        </div>

        <!-- gradient overlay -->
        <div class="sc-image-gradient" />

        <!-- top-left: time tag -->
        <div class="sc-badges-tl">
          <span class="sc-badge sc-badge-dark">{{ place.time_tag || place.match_time_of_day }}</span>
        </div>

        <!-- top-right: counter + must-see -->
        <div class="sc-badges-tr">
          <span v-if="images.length > 1" class="sc-badge sc-badge-dark">
            {{ imgIndex + 1 }} / {{ images.length }}
          </span>
          <span v-if="place.is_universal" class="sc-badge sc-badge-mustsee">Must-see</span>
          <span v-else-if="place.is_hidden_gem" class="sc-badge sc-badge-gem">Hidden gem</span>
        </div>

        <!-- image progress dots -->
        <div v-if="images.length > 1" class="sc-image-progress">
          <div v-for="(_, i) in images" :key="i" class="sc-image-dot" :class="{ 'on': i === imgIndex }" />
        </div>

        <!-- Scroll hint (only visible on tall photo) -->
        <div class="sc-scroll-hint">
          <i class="fa-solid fa-chevron-up"></i>
          <span>Scroll for more</span>
        </div>
      </div>

      <!-- INFO -->
      <div class="sc-info">
        <!-- Title block -->
        <div class="sc-title-block">
          <h2 class="sc-name">{{ displayName }}</h2>
          <p v-if="subName" class="sc-sub">{{ subName }}</p>
        </div>

        <!-- Meta pills -->
        <div class="sc-meta-row">
          <span v-if="displayPrice"    class="sc-pill sc-pill-gold">{{ displayPrice }}</span>
          <span v-if="displayDuration" class="sc-pill sc-pill-dark">
            <i class="fa-regular fa-clock"></i> {{ displayDuration }}
          </span>
          <span v-if="displayHours"    class="sc-pill sc-pill-dark">
            {{ displayHours }}
          </span>
        </div>

        <!-- Description (full, no clamp) -->
        <p v-if="displayDesc" class="sc-desc">{{ displayDesc }}</p>

        <!-- Vibe tags -->
        <div v-if="place.vibe_tags?.length" class="sc-vibe-row">
          <span
            v-for="tag in place.vibe_tags"
            :key="tag"
            class="sc-vibe-tag"
            :style="{ background: vibeStyle(tag).bg, borderColor: vibeStyle(tag).border, color: vibeStyle(tag).color }"
          >{{ tag }}</span>
        </div>

        <!-- Divider -->
        <div class="sc-divider"></div>

        <!-- Detail rows -->
        <div class="sc-detail-list">
          <div class="sc-detail">
            <i class="fa-solid fa-location-dot"></i>
            <span>{{ footerLocation }}</span>
          </div>
          <div v-if="transit" class="sc-detail">
            <i class="fa-solid fa-train-subway"></i>
            <span>
              {{ transit.station }}<template v-if="transit.note"> · {{ transit.note }}</template>
            </span>
          </div>
          <div v-if="displayHours" class="sc-detail">
            <i class="fa-regular fa-clock"></i>
            <span>{{ displayHours }}</span>
          </div>
        </div>

        <!-- bottom padding for breathing room -->
        <div class="sc-bottom-spacer"></div>
      </div>
    </div>

    <!-- ── YEP / NOPE stamps (above scroll, fixed on card) ─── -->
    <Transition name="stamp">
      <div v-if="isTop && showYep" class="sc-stamp sc-stamp-yep"
        :style="{ opacity: Math.max(0, (dragProgress - 0.1) / 0.9) }">
        <span>ADD</span>
      </div>
    </Transition>

    <Transition name="stamp">
      <div v-if="isTop && showNope" class="sc-stamp sc-stamp-nope"
        :style="{ opacity: Math.max(0, (dragProgress - 0.1) / 0.9) }">
        <span>NOPE</span>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* ─── Card shell ─── */
.sc-card {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 28px;
  background: #fff;
  box-shadow: 0 20px 60px rgba(30, 41, 59, 0.18), 0 4px 16px rgba(30, 41, 59, 0.10);
  border: 1px solid rgba(255, 255, 255, 0.7);
  overflow: hidden;
  user-select: none;
  -webkit-user-select: none;
  /* Allow native vertical pan, we handle horizontal swipe */
  touch-action: pan-y;
}

/* ─── Scrollable content ─── */
.sc-scroll {
  position: absolute;
  inset: 0;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  scroll-behavior: smooth;
}
.sc-scroll::-webkit-scrollbar { width: 0; display: none; }
.sc-scroll { scrollbar-width: none; }

/* ─── Image area (scrolls away with content) ─── */
.sc-image-area {
  position: relative;
  width: 100%;
  /* Fixed aspect for predictable feel */
  aspect-ratio: 4 / 3;
  flex-shrink: 0;
  overflow: hidden;
  background: linear-gradient(145deg, #1C1C1E 0%, #242426 60%, #1a1a1c 100%);
}
.sc-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: opacity 0.18s ease;
}
.sc-image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  opacity: 0.15;
}
.sc-placeholder-label {
  margin-top: 10px;
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: rgba(255, 255, 255, 0.6);
}
.sc-image-gradient {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.5) 0%, transparent 35%, transparent 70%, rgba(0,0,0,0.2) 100%);
}

/* Badges */
.sc-badges-tl {
  position: absolute;
  top: 14px;
  left: 14px;
  z-index: 2;
  pointer-events: none;
}
.sc-badges-tr {
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  pointer-events: none;
}
.sc-badge {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  padding: 5px 11px;
  border-radius: 9999px;
  white-space: nowrap;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}
.sc-badge-dark {
  background: rgba(0, 0, 0, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: rgba(255, 255, 255, 0.95);
  text-transform: uppercase;
}
.sc-badge-mustsee {
  background: rgba(52, 199, 89, 0.18);
  border: 1px solid rgba(52, 199, 89, 0.5);
  color: #1B9C45;
  text-transform: uppercase;
}
.sc-badge-gem {
  background: rgba(167, 139, 250, 0.18);
  border: 1px solid rgba(167, 139, 250, 0.5);
  color: #7C3AED;
  text-transform: uppercase;
}

.sc-image-progress {
  position: absolute;
  bottom: 12px;
  left: 16px;
  right: 16px;
  display: flex;
  gap: 4px;
  z-index: 2;
}
.sc-image-dot {
  flex: 1;
  height: 2.5px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.28);
  transition: background 0.2s;
}
.sc-image-dot.on { background: rgba(255, 255, 255, 0.95); }

.sc-scroll-hint {
  position: absolute;
  bottom: 22px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  color: rgba(255, 255, 255, 0.75);
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  z-index: 2;
  pointer-events: none;
  animation: hint-bob 2.6s ease-in-out infinite;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
}
.sc-scroll-hint i {
  font-size: 10px;
}
@keyframes hint-bob {
  0%, 100% { transform: translate(-50%, 0); opacity: 0.85; }
  50%      { transform: translate(-50%, -4px); opacity: 1; }
}

/* ─── Info area ─── */
.sc-info {
  padding: 22px 22px 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: #fff;
}
.sc-title-block {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.sc-name {
  font-size: 22px;
  font-weight: 900;
  color: var(--navy);
  letter-spacing: -0.015em;
  line-height: 1.18;
}
.sc-sub {
  font-size: 12px;
  color: rgba(30, 41, 59, 0.42);
  letter-spacing: 0.01em;
  line-height: 1.3;
  margin-top: 2px;
}

/* Meta pills row */
.sc-meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}
.sc-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 700;
  padding: 5px 11px;
  border-radius: 9999px;
  white-space: nowrap;
}
.sc-pill i { font-size: 10px; opacity: 0.8; }
.sc-pill-gold { background: rgba(255, 140, 66, 0.13); color: #C2610A; }
.sc-pill-dark { background: rgba(30, 41, 59, 0.06); color: rgba(30, 41, 59, 0.6); }

/* Description — full text, scrollable */
.sc-desc {
  font-size: 13.5px;
  color: rgba(30, 41, 59, 0.75);
  line-height: 1.62;
  letter-spacing: 0.005em;
}

/* Vibe tags */
.sc-vibe-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.sc-vibe-tag {
  font-size: 9.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  padding: 4px 10px;
  border-radius: 9999px;
  border-width: 1px;
  border-style: solid;
}

/* Divider */
.sc-divider {
  height: 1px;
  background: rgba(30, 41, 59, 0.07);
  margin: 4px 0;
}

/* Detail rows (location, transit, hours) */
.sc-detail-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.sc-detail {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 12.5px;
  color: rgba(30, 41, 59, 0.7);
  line-height: 1.4;
  font-weight: 500;
}
.sc-detail i {
  font-size: 12px;
  color: var(--orange);
  margin-top: 2px;
  flex-shrink: 0;
  width: 14px;
  text-align: center;
}

.sc-bottom-spacer { height: 32px; }

/* ─── Stamps (above scroll content) ─── */
.sc-stamp {
  position: absolute;
  top: 60px;
  z-index: 30;
  pointer-events: none;
  padding: 8px 18px;
  border-radius: 12px;
  border: 3px solid;
  font-size: 22px;
  font-weight: 900;
  letter-spacing: 0.08em;
}
.sc-stamp-yep {
  left: 18px;
  border-color: var(--orange);
  color: var(--orange);
  background: rgba(255, 140, 66, 0.12);
  transform: rotate(-15deg);
  transform-origin: left center;
  text-shadow: 0 0 18px rgba(255, 140, 66, 0.5);
}
.sc-stamp-nope {
  right: 18px;
  border-color: #FF3B30;
  color: #FF3B30;
  background: rgba(255, 59, 48, 0.08);
  transform: rotate(15deg);
  transform-origin: right center;
  text-shadow: 0 0 18px rgba(255, 59, 48, 0.5);
}

.stamp-enter-active, .stamp-leave-active { transition: opacity 0.1s ease; }
.stamp-enter-from, .stamp-leave-to { opacity: 0 !important; }
</style>
