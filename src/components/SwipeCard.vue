<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
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
let moveHistory     = []   // recent {x, y, t}, trimmed to a ~100ms window
let grabFactor      = 1    // +1 grabbed top half, −1 bottom half (real-card torque)
let cardWidth       = 320  // measured once at pointerdown
let activePointerId = null // guards against a second finger landing mid-gesture
let exitCleanup     = null // clears the pending exit's listener/timeout on unmount
let progressRaf     = 0    // rAF handle coalescing drag-progress emits to one per frame

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
// Coalesced to one emit per frame — pointermove can fire faster than the
// back card's scale/translateY reactivity needs to update.
watch(dragProgress, () => {
  if (!props.isTop || progressRaf) return
  progressRaf = requestAnimationFrame(() => {
    progressRaf = 0
    emit('drag-progress', dragProgress.value)
  })
})

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
  // Skip if the touch originated on an interactive element
  if (e.target.closest('button, a, input, textarea, select, label, [data-swipe-ignore]')) return
  // Ignore a second finger landing mid-gesture — one active pointer at a time
  if (activePointerId !== null) return
  activePointerId = e.pointerId
  isDragging.value = true
  startX.value = e.clientX
  startY.value = e.clientY
  gestureLock.value = null
  const rect = e.currentTarget.getBoundingClientRect()
  cardWidth  = rect.width || 320
  grabFactor = e.clientY < rect.top + rect.height / 2 ? 1 : -1
  moveHistory = [{ x: e.clientX, y: e.clientY, t: e.timeStamp }]
  // Pointer capture is taken once the gesture locks horizontal (see
  // onPointerMove) — capturing immediately can make some mobile browsers
  // hand the whole gesture to us before native vertical scroll can claim it.
  tapStartX = e.clientX
  tapStartY = e.clientY
  isTap = true
}

function onPointerMove(e) {
  if (!isDragging.value) return
  if (activePointerId !== e.pointerId) return // ignore a second finger's moves
  const dx = e.clientX - startX.value
  const dy = e.clientY - startY.value

  // Lock direction once movement exceeds threshold
  if (gestureLock.value === null) {
    if (Math.abs(dx) < LOCK_TOL && Math.abs(dy) < LOCK_TOL) return
    // Bias toward vertical (1.3x) — accidental horizontal flicks while scrolling shouldn't swipe
    if (Math.abs(dx) > Math.abs(dy) * 1.3) {
      gestureLock.value = 'h'
      try { e.currentTarget.setPointerCapture(e.pointerId) } catch {}
    } else {
      gestureLock.value = 'v'
      isTap = false // scrolling is not a tap — don't flip the image on release
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
  if (activePointerId !== null && activePointerId !== e.pointerId) return
  activePointerId = null
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

function onPointerCancel(e) {
  if (e && activePointerId !== null && activePointerId !== e.pointerId) return
  activePointerId = null
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

  // Emit on transitionend from the card itself; setTimeout is only the
  // fallback (background tabs may never fire the event). Filtering by
  // target+propertyName stops a bubbled child transition (e.g. the stamp
  // fade) from finishing the exit early.
  const el = cardRef.value
  let done = false
  const finish = () => {
    if (done) return
    done = true
    el?.removeEventListener('transitionend', onTransitionEnd)
    clearTimeout(timeoutId)
    exitCleanup = null
    emit(event)
  }
  const onTransitionEnd = (evt) => {
    if (evt.target === el && (evt.propertyName === 'transform' || evt.propertyName === 'opacity')) finish()
  }
  el?.addEventListener('transitionend', onTransitionEnd)
  const timeoutId = setTimeout(finish, duration + 80)
  exitCleanup = () => { el?.removeEventListener('transitionend', onTransitionEnd); clearTimeout(timeoutId) }
}
defineExpose({ triggerExit })

onBeforeUnmount(() => {
  exitCleanup?.()
  if (progressRaf) cancelAnimationFrame(progressRaf)
})

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
    @lostpointercapture="onPointerCancel"
    @dragstart.prevent
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

        <!-- top-left: time tag -->
        <div class="sc-badges-tl">
          <span class="sc-badge sc-badge-dark data-mono">{{ place.time_tag || place.match_time_of_day }}</span>
        </div>

        <!-- top-right: counter + must-see -->
        <div class="sc-badges-tr">
          <span v-if="images.length > 1" class="sc-badge sc-badge-dark data-mono">
            {{ imgIndex + 1 }}/{{ images.length }}
          </span>
          <span v-if="place.is_universal" class="sc-badge sc-badge-mustsee data-mono">Must-see</span>
          <span v-else-if="place.is_hidden_gem" class="sc-badge sc-badge-gem data-mono">Hidden gem</span>
        </div>

        <!-- image progress dots -->
        <div v-if="images.length > 1" class="sc-image-progress">
          <div v-for="(_, i) in images" :key="i" class="sc-image-dot" :class="{ 'on': i === imgIndex }" />
        </div>

        <!-- Scroll hint (only visible on tall photo) -->
        <div class="sc-scroll-hint data-mono">
          <i class="fa-solid fa-chevron-up"></i>
          <span>Scroll for more</span>
        </div>
      </div>

      <!-- INFO -->
      <div class="sc-info">
        <!-- Title block -->
        <div class="sc-title-block">
          <h2 class="sc-name display-cond">{{ displayName }}</h2>
          <p v-if="subName" class="sc-sub">{{ subName }}</p>
        </div>

        <!-- Meta pills — ticket data row, all Mono -->
        <div class="sc-meta-row">
          <span v-if="displayPrice"    class="sc-pill sc-pill-gold data-mono">{{ displayPrice }}</span>
          <span v-if="displayDuration" class="sc-pill sc-pill-dark data-mono">
            <i class="fa-regular fa-clock"></i> {{ displayDuration }}
          </span>
          <span v-if="displayHours"    class="sc-pill sc-pill-dark data-mono">
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
            class="sc-vibe-tag data-mono"
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

    <!-- ── BOARD / SKIP stamps (above scroll, fixed on card) ─── -->
    <Transition name="stamp">
      <div v-if="isTop && showYep" class="sc-stamp sc-stamp-yep data-mono"
        :style="{ opacity: Math.max(0, (dragProgress - 0.1) / 0.9) }">
        <span>BOARD</span>
      </div>
    </Transition>

    <Transition name="stamp">
      <div v-if="isTop && showNope" class="sc-stamp sc-stamp-nope data-mono"
        :style="{ opacity: Math.max(0, (dragProgress - 0.1) / 0.9) }">
        <span>SKIP</span>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* ─── Card shell — a ticket: sharp edges, flat, hairline border ─── */
.sc-card {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 8px;
  background: #fff;
  border: 1px solid var(--hairline);
  overflow: hidden;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
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
  background: var(--ink);
  border-bottom: 1px solid var(--hairline);
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
  opacity: 0.25;
}
.sc-placeholder-label {
  margin-top: 10px;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 9px;
  font-weight: 500;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.6);
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
/* Badges — solid signage plates. No blur, no transparency. */
.sc-badge {
  font-size: 10px;
  padding: 5px 11px;
  border-radius: 999px;
  white-space: nowrap;
  text-transform: uppercase;
}
.sc-badge-dark {
  background: var(--ink);
  border: 1px solid rgba(255, 255, 255, 0.25);
  color: #fff;
}
.sc-badge-mustsee {
  background: var(--signal);
  border: 1px solid var(--ink);
  color: var(--ink);
}
.sc-badge-gem {
  background: #fff;
  border: 1px dashed var(--signal);
  color: var(--ink);
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
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #fff;
  background: var(--ink);
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 9px;
  text-transform: uppercase;
  z-index: 2;
  pointer-events: none;
}
.sc-scroll-hint i {
  font-size: 9px;
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
  font-size: 23px;
  color: var(--ink);
  line-height: 1.15;
}
.sc-sub {
  font-size: 12px;
  color: var(--muted);
  line-height: 1.3;
  margin-top: 2px;
}

/* Meta pills row — ticket data */
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
  padding: 5px 11px;
  border-radius: 999px;
  white-space: nowrap;
  background: #fff;
}
.sc-pill i { font-size: 10px; opacity: 0.8; }
.sc-pill-gold { border: 1px solid var(--line-1); color: var(--orange-text); }
.sc-pill-dark { border: 1px solid var(--hairline); color: var(--muted); }

/* Description — full text, scrollable */
.sc-desc {
  font-size: 13.5px;
  color: var(--ink);
  line-height: 1.62;
}

/* Vibe tags */
.sc-vibe-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.sc-vibe-tag {
  font-size: 9.5px;
  text-transform: uppercase;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid var(--hairline);
  color: var(--muted);
  background: #fff;
}

/* Divider — ticket tear line */
.sc-divider {
  height: 0;
  border-top: 1px dashed var(--hairline);
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
  color: var(--ink);
  line-height: 1.4;
  font-weight: 500;
}
.sc-detail i {
  font-size: 12px;
  color: var(--muted);
  margin-top: 2px;
  flex-shrink: 0;
  width: 14px;
  text-align: center;
}
.sc-detail i.fa-train-subway { color: var(--line-2); }

.sc-bottom-spacer { height: 32px; }

/* ─── Stamps — station-sign plates in system colors ─── */
.sc-stamp {
  position: absolute;
  top: 60px;
  z-index: 30;
  pointer-events: none;
  padding: 8px 18px;
  border-radius: 8px;
  border: 3px solid;
  background: rgba(255, 255, 255, 0.92);
  font-size: 22px;
}
.sc-stamp-yep {
  left: 18px;
  border-color: var(--line-2);
  color: var(--line-2);
  transform: rotate(-15deg);
  transform-origin: left center;
}
.sc-stamp-nope {
  right: 18px;
  border-color: var(--ink);
  color: var(--ink);
  transform: rotate(15deg);
  transform-origin: right center;
}

.stamp-enter-active, .stamp-leave-active { transition: opacity 0.1s ease; }
.stamp-enter-from, .stamp-leave-to { opacity: 0 !important; }
</style>
