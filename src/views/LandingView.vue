<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { db } from '@/firebase'
import { collection, query, where, getDocs, limit } from 'firebase/firestore'

const router = useRouter()

// ── Bangkok live clock ─────────────────────────────────────────────
const now = ref(new Date())
let clockInterval = null

const bkkTimeLabel = computed(() => {
  const bkk = new Date(now.value.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }))
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const day = days[bkk.getDay()]
  let h = bkk.getHours()
  const m = String(bkk.getMinutes()).padStart(2, '0')
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${day} ${h}:${m} ${ampm}`
})

const bkkVibeNow = computed(() => {
  const bkk = new Date(now.value.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }))
  const h = bkk.getHours()
  if (h < 6)  return 'Late night'
  if (h < 11) return 'Morning'
  if (h < 15) return 'Afternoon'
  if (h < 19) return 'Golden hour'
  if (h < 22) return 'Evening'
  return 'Night'
})

const replacements = [
  { kill: "TikToks you'll never open again",     icon: 'fa-mobile-screen' },
  { kill: "ChatGPT itineraries with fake places", icon: 'fa-robot' },
  { kill: "Pinterest boards from 2019",          icon: 'fa-bookmark' },
  { kill: '"Top 10 Bangkok" listicles from 2017', icon: 'fa-newspaper' },
  { kill: "Google Maps lists with 80 random pins", icon: 'fa-location-pin' },
  { kill: "Reddit threads from r/Bangkok",       icon: 'fa-reddit-alien' },
]

const steps = [
  {
    n: 1,
    icon: 'fa-hand-pointer',
    title: 'Pick your vibe',
    desc: "Chill? Foodie? Party animal? Just pick a mood — don't overthink it. That's literally the whole point of this app.",
  },
  {
    n: 2,
    icon: 'fa-layer-group',
    title: 'Swipe to build your list',
    desc: "Like Tinder but for Bangkok spots. Yep the ones you want, nope the ones you don't. Whole thing takes 2 minutes.",
  },
  {
    n: 3,
    icon: 'fa-map-location-dot',
    title: 'Get your route',
    desc: 'Zone-sorted. Time-optimised. Map ready. Share the link and walk out looking like you\'ve lived here your whole life.',
  },
]

const features = [
  { icon: 'fa-map', label: 'Interactive map with all your spots' },
  { icon: 'fa-route', label: 'Zone-optimised multi-day routing' },
  { icon: 'fa-share-nodes', label: 'One shareable link — no app needed' },
  { icon: 'fa-gem', label: 'Hidden gems near your itinerary' },
]

// Chip dot colors — system tokens only (line-1/2/3, signal, ink)
const typeConfig = {
  food:       { icon: 'fa-bowl-rice',    color: '#FF8C42' },
  attraction: { icon: 'fa-camera',       color: '#12796F' },
  nightlife:  { icon: 'fa-music',        color: '#C2497D' },
  market:     { icon: 'fa-store',        color: '#FFD235' },
  wellness:   { icon: 'fa-spa',          color: '#12796F' },
  shopping:   { icon: 'fa-bag-shopping', color: '#C2497D' },
  area:       { icon: 'fa-map-pin',      color: '#1C273D' },
}

const defaultType = { icon: 'fa-location-dot', color: '#FF8C42' }

const marqueeRow1 = ref([])
const marqueeRow2 = ref([])

// ── Scroll progress bar (LandingView-only — matches its "read top to bottom" nature) ──
const scrollProgress = ref(0)
function onScroll() {
  const h = document.documentElement
  const scrollable = h.scrollHeight - h.clientHeight || 1
  scrollProgress.value = Math.min(100, Math.max(0, (h.scrollTop / scrollable) * 100))
}

// ── Hero stat counters — count up once on load (hero is always above the fold) ──
const heroStats = ref([
  { target: 483, value: 0, suffix: '+', label: 'Real places' },
  { target: 30,  value: 0, suffix: 's', label: 'To a route' },
  { target: 0,   value: 0, suffix: '',  label: 'Sign-ups needed' },
])

// ── Scramble/decode tagline — locks in left-to-right like it's decoding ──
const SCRAMBLE_FINAL = 'Free · No sign-up · Works on any phone'
const scrambleText = ref(SCRAMBLE_FINAL)
function runScramble() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&$?/'
  let frame = 0
  const iv = setInterval(() => {
    frame++
    let out = ''
    for (let i = 0; i < SCRAMBLE_FINAL.length; i++) {
      const c = SCRAMBLE_FINAL[i]
      if (c === ' ' || c === '·') { out += c; continue }
      out += frame > i * 2 + 6 ? c : chars[Math.floor(Math.random() * chars.length)]
    }
    scrambleText.value = out
    if (frame > SCRAMBLE_FINAL.length * 2 + 10) { clearInterval(iv); scrambleText.value = SCRAMBLE_FINAL }
  }, 28)
}

function animateCount(stat, duration = 1100) {
  const start = performance.now()
  function tick(now) {
    const p = Math.min((now - start) / duration, 1)
    const eased = 1 - Math.pow(1 - p, 3)
    stat.value = Math.round(stat.target * eased)
    if (p < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

// ── Hero demo deck ──────────────────────────────────────────────────
// A real, swipeable deck on the landing page: showing the core loop beats
// describing it. Uses real Firestore places, and deliberately renders no
// photography — every image URL 403s while billing is detached, and a
// station-sign card reads better here anyway.
const deck        = ref([])
const demoPicks   = ref([])
const dragX       = ref(0)
const dragY       = ref(0)
const dragging    = ref(false)
const exitDir     = ref(0)
let   demoStartX  = 0
let   demoStartY  = 0
const COMMIT_PX   = 90

const frontCard = computed(() => deck.value[0] ?? null)
const stampOpacity = computed(() => Math.min(Math.abs(dragX.value) / COMMIT_PX, 1))

function deckCardStyle(i) {
  if (i === 0) {
    if (exitDir.value !== 0) {
      return {
        transform: `translate(${exitDir.value * 620}px, ${dragY.value * 0.4}px) rotate(${exitDir.value * 22}deg)`,
        opacity: 0,
        transition: 'transform 0.42s cubic-bezier(.3,.6,.3,1), opacity 0.42s',
      }
    }
    return {
      transform: `translate(${dragX.value}px, ${dragY.value * 0.4}px) rotate(${dragX.value * 0.06}deg)`,
      transition: dragging.value ? 'none' : 'transform 0.42s cubic-bezier(.2,.8,.3,1)',
    }
  }
  return {
    transform: `translateY(${i * -13}px) scale(${1 - i * 0.05})`,
    opacity: i > 3 ? 0 : 1,
  }
}

function onDeckDown(e) {
  if (exitDir.value !== 0 || !frontCard.value) return
  dragging.value = true
  demoStartX = e.clientX
  demoStartY = e.clientY
  try { e.currentTarget.setPointerCapture(e.pointerId) } catch {}
}
function onDeckMove(e) {
  if (!dragging.value) return
  dragX.value = e.clientX - demoStartX
  dragY.value = e.clientY - demoStartY
}
function onDeckUp() {
  if (!dragging.value) return
  dragging.value = false
  if (dragX.value > COMMIT_PX) commitDemo(1)
  else if (dragX.value < -COMMIT_PX) commitDemo(-1)
  else { dragX.value = 0; dragY.value = 0 }
}
function commitDemo(dir) {
  if (exitDir.value !== 0 || !frontCard.value) return
  const card = frontCard.value
  exitDir.value = dir
  if (dir > 0) demoPicks.value.push(card.name_en || card.name)
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  setTimeout(() => {
    deck.value.push(deck.value.shift())   // endless deck — cycle, never run dry
    exitDir.value = 0
    dragX.value = 0
    dragY.value = 0
  }, reduced ? 60 : 430)
}

const demoTrail = computed(() => ({
  shown: demoPicks.value.slice(-3),
  overflow: Math.max(0, demoPicks.value.length - 3),
}))

async function loadMarquee() {
  try {
    const snap = await getDocs(query(collection(db, 'places'), where('city', '==', 'Bangkok'), limit(60)))
    const all = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(p => p.name_en)
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]]
    }
    marqueeRow1.value = all.slice(0, 20)
    marqueeRow2.value = all.slice(20, 40)
    // Prefer places that carry a zone + at least one vibe tag — the demo card
    // shows both, and a card with blank fields undersells the product.
    deck.value = all
      .filter(p => (p.zone_en || p.zone) && p.vibe_tags?.length)
      .slice(0, 6)
  } catch (e) {
    // silently fail — marquee and demo deck are both non-essential
  }
}

onMounted(() => {
  loadMarquee()

  clockInterval = setInterval(() => { now.value = new Date() }, 30000)

  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  const observer = new IntersectionObserver(
    (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('in') }),
    { threshold: 0.1 }
  )
  document.querySelectorAll('.reveal, .hero-line').forEach(el => observer.observe(el))

  if (reducedMotion) {
    heroStats.value.forEach(s => { s.value = s.target })
  } else {
    setTimeout(() => heroStats.value.forEach(s => animateCount(s)), 260)
    setTimeout(runScramble, 500)
  }

  window.addEventListener('scroll', onScroll, { passive: true })
})
onUnmounted(() => {
  if (clockInterval) clearInterval(clockInterval)
  window.removeEventListener('scroll', onScroll)
})
</script>

<template>
  <div class="landing-root">

    <!-- Scroll progress -->
    <div class="lv-progress-bar" :style="{ width: scrollProgress + '%' }" aria-hidden="true"></div>

    <!-- Nav -->
    <nav class="glass-nav fixed top-0 left-0 right-0 z-50 h-16"
      style="padding-top: max(env(safe-area-inset-top), 0px);">
      <div class="max-w-7xl mx-auto h-full px-4 md:px-6 lg:px-8 flex items-center justify-between gap-6">
        <span class="text-2xl display-cond flex-shrink-0 flex items-center" style="color:var(--ink)">
          plz<span style="color:var(--orange-text)">go</span><span class="logo-dot"></span>
        </span>
        <div class="hidden md:flex items-center gap-6 flex-1">
          <button class="nav-link-active text-sm font-bold" @click="router.push('/plan')">Plan a Trip</button>
          <button class="nav-link-active text-sm font-bold" @click="router.push('/explore')">Explore</button>
          <span class="nav-link-soon text-sm font-bold">Community <span class="soon-badge">Coming Soon</span></span>
        </div>
        <!-- The desktop nav-links block above is hidden below md — without this,
             there was no way to reach /explore from the nav on mobile at all. -->
        <button class="nav-link-active text-sm font-bold md:hidden" @click="router.push('/explore')">Explore</button>
        <button
          class="btn-ios btn-arrow h-10 px-6 rounded-full text-sm font-bold flex-shrink-0"
          @click="router.push('/plan')"
        >
          Get Started <i class="fa-solid fa-arrow-right ml-1.5 btn-arrow-icon"></i>
        </button>
      </div>
    </nav>

    <!-- Hero — ink tunnel, dot grid, one warm glow. Copy left, live deck right. -->
    <section class="hero-section plz-dotgrid plz-glow">
      <div class="hero-grid">

        <!-- Left: the pitch -->
        <div class="hero-copy">
          <div class="live-chip">
            <span class="live-dot"></span>
            <span class="live-city">BANGKOK</span>
            <span class="live-sep">·</span>
            <span class="live-time">{{ bkkTimeLabel }}</span>
            <span class="live-sep">·</span>
            <span class="live-vibe">{{ bkkVibeNow }}</span>
          </div>

          <h1 class="hero-h1 display-cond">
            <span class="hero-line"><span>Stop overthinking.</span></span>
            <span class="hero-line"><span class="hero-accent">Just go.</span></span>
          </h1>

          <p class="hero-tagline data-mono">{{ scrambleText }}</p>

          <p class="hero-sub">
            Swipe Bangkok spots. Get a map-optimised route. Share it with one link.
            No spreadsheets. No Pinterest boards. Just vibes.
          </p>

          <div class="hero-cta">
            <button class="btn-ios btn-arrow hero-cta-btn" @click="router.push('/plan')">
              Start Swiping <i class="fa-solid fa-arrow-right ml-2 btn-arrow-icon"></i>
            </button>
          </div>

          <div class="hero-stats">
            <div class="hstat" v-for="stat in heroStats" :key="stat.label">
              <b>{{ stat.value }}<sup v-if="stat.suffix">{{ stat.suffix }}</sup></b>
              <span>{{ stat.label }}</span>
            </div>
          </div>
        </div>

        <!-- Right: a deck you can actually swipe, right here -->
        <div class="hero-deck">
          <div class="deck-sway">
            <div
              class="deck-stage"
              @pointerdown="onDeckDown"
              @pointermove="onDeckMove"
              @pointerup="onDeckUp"
              @pointercancel="onDeckUp"
              @lostpointercapture="onDeckUp"
              @dragstart.prevent
            >
              <template v-if="deck.length">
                <div
                  v-for="(place, i) in deck"
                  :key="place.id"
                  class="demo-card"
                  :class="{ 'demo-card-front': i === 0 }"
                  :style="[deckCardStyle(i), { zIndex: deck.length - i }]"
                >
                  <!-- Station-sign panel: colour encodes place type -->
                  <div
                    class="demo-face"
                    :style="{ background: (typeConfig[place.type] || defaultType).color }"
                  >
                    <i :class="`fa-solid ${(typeConfig[place.type] || defaultType).icon} demo-face-icon`"></i>
                    <span class="demo-face-type data-mono">{{ place.type || 'place' }}</span>
                  </div>

                  <div class="demo-body">
                    <p class="demo-name display-cond">{{ place.name_en || place.name }}</p>
                    <p class="demo-zone data-mono">{{ place.zone_en || place.zone }}</p>
                    <div class="demo-vibes">
                      <span v-for="t in (place.vibe_tags || []).slice(0, 3)" :key="t" class="demo-vibe data-mono">{{ t }}</span>
                    </div>
                  </div>

                  <template v-if="i === 0">
                    <span class="demo-stamp demo-stamp-yep display-cond"
                      :style="{ opacity: dragX > 0 ? stampOpacity : 0 }">BOARD</span>
                    <span class="demo-stamp demo-stamp-nope display-cond"
                      :style="{ opacity: dragX < 0 ? stampOpacity : 0 }">SKIP</span>
                  </template>
                </div>
              </template>

              <!-- Skeleton while the pool loads -->
              <div v-else class="demo-card demo-skeleton"></div>
            </div>
          </div>

          <div class="deck-actions">
            <button class="dbtn dbtn-pass" @click="commitDemo(-1)" aria-label="Skip this spot">
              <i class="fa-solid fa-xmark"></i>
            </button>
            <div class="dcount data-mono">
              <b>{{ demoPicks.length }}</b>
              <span>in your plan</span>
            </div>
            <button class="dbtn dbtn-like" @click="commitDemo(1)" aria-label="Board this spot">
              <i class="fa-solid fa-plus"></i>
            </button>
          </div>

          <!-- The route assembling itself as you pick -->
          <div class="plz-trail hero-trail">
            <template v-if="demoTrail.shown.length">
              <template v-for="(name, i) in demoTrail.shown" :key="name + i">
                <span v-if="i > 0" class="plz-trail-arrow">→</span>
                <span class="plz-trail-pin">{{ name }}</span>
              </template>
              <span v-if="demoTrail.overflow" class="plz-trail-pin hero-trail-more">+{{ demoTrail.overflow }}</span>
            </template>
            <p v-else class="deck-hint data-mono">Drag a card — or tap ✕ / +</p>
          </div>

          <div class="deck-cta" :class="{ 'show': demoPicks.length >= 3 }">
            That's the whole app. Build the real one →
          </div>
        </div>

      </div>
    </section>

    <!-- Live Marquee -->
    <section v-if="marqueeRow1.length" class="marquee-section">
      <div class="marquee-header reveal">
        <p class="data-mono text-[10px] uppercase mb-2" style="color:var(--orange-text)">Real Bangkok spots</p>
        <h2 class="text-2xl lg:text-3xl display-cond" style="color:var(--ink)">
          483 places. Handpicked. <span class="accent-cond">Not AI-hallucinated.</span>
        </h2>
      </div>

      <!-- Marquee track — both rows go left, edge-faded -->
      <div class="marquee-track">
        <!-- Row 1: 52s -->
        <div class="marquee-row">
          <div class="marquee-inner marquee-l1">
            <template v-for="pass in 2" :key="'r1-' + pass">
              <div v-for="place in marqueeRow1" :key="place.id + '-r1-' + pass" class="place-chip"
                :style="{ '--dot-color': (typeConfig[place.type] || defaultType).color }">
                <span class="chip-dot"></span>
                <span class="chip-name">{{ place.name_en }}</span>
              </div>
            </template>
          </div>
        </div>

        <!-- Row 2: 72s (slower = parallax depth, not chaos) -->
        <div class="marquee-row mt-4">
          <div class="marquee-inner marquee-l2">
            <template v-for="pass in 2" :key="'r2-' + pass">
              <div v-for="place in marqueeRow2" :key="place.id + '-r2-' + pass" class="place-chip"
                :style="{ '--dot-color': (typeConfig[place.type] || defaultType).color }">
                <span class="chip-dot"></span>
                <span class="chip-name">{{ place.name_en }}</span>
              </div>
            </template>
          </div>
        </div>
      </div>
    </section>

    <!-- Stop Using ___ (Sass section) -->
    <section class="py-20 lg:py-24">
      <div class="max-w-5xl mx-auto px-4 md:px-6 lg:px-8">
        <div class="text-center mb-12 reveal">
          <p class="data-mono text-[11px] uppercase mb-3" style="color:var(--orange-text)">A short intervention</p>
          <h2 class="text-3xl lg:text-5xl display-cond leading-[0.95]" style="color:var(--ink)">
            You can stop<br>
            <span class="accent-cond" style="color:var(--orange-text)">doing all this now.</span>
          </h2>
        </div>

        <div class="kill-grid">
          <div v-for="(item, i) in replacements" :key="item.kill"
            class="kill-card reveal"
            :style="{ transitionDelay: i * 0.04 + 's' }"
          >
            <div class="kill-icon">
              <i :class="`fa-solid ${item.icon}`"></i>
            </div>
            <div class="kill-text">
              <span class="kill-strike">{{ item.kill }}</span>
            </div>
          </div>
        </div>

        <div class="kill-cta reveal" style="transition-delay: 0.28s">
          <p class="kill-arrow"><i class="fa-solid fa-arrow-down"></i></p>
          <p class="kill-resolution">We did the work. <span class="accent-cond" style="color:var(--orange-text)">Just swipe.</span></p>
        </div>
      </div>
    </section>

    <!-- How it works -->
    <section class="py-20 lg:py-28">
      <div class="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <div class="text-center mb-14 reveal">
          <p class="data-mono text-[11px] uppercase mb-3" style="color:var(--orange-text)">How it works</p>
          <h2 class="text-3xl lg:text-4xl display-cond" style="color:var(--ink)">
            Three steps. <span class="accent-cond">Zero stress.</span>
          </h2>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div v-for="step in steps" :key="step.n"
            class="reveal"
            :style="{ transitionDelay: (step.n - 1) * 0.08 + 's' }"
          >
            <div class="glass-panel step-card p-8 flex flex-col gap-5">
              <div class="step-number-deco">{{ String(step.n).padStart(2, '0') }}</div>
              <div class="w-12 h-12 rounded-lg flex items-center justify-center"
                style="background: var(--paper); border: 1px solid var(--hairline);">
                <i :class="`fa-solid ${step.icon} text-xl`" style="color:var(--orange-text)"></i>
              </div>
              <div>
                <p class="data-mono text-[10px] uppercase mb-1.5" style="color:var(--orange-text)">
                  Step {{ step.n }}
                </p>
                <h3 class="text-lg font-black mb-2" style="color:var(--ink)">{{ step.title }}</h3>
                <p class="text-sm lv-muted leading-relaxed font-medium">{{ step.desc }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Features -->
    <section class="py-10 lg:py-16">
      <div class="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

          <div class="reveal">
            <p class="data-mono text-[11px] uppercase mb-3" style="color:var(--orange-text)">What you get</p>
            <h2 class="text-3xl lg:text-4xl display-cond mb-5 leading-tight" style="color:var(--ink)">
              A plan so solid, your friends will think<br><span class="accent-cond">you live here.</span>
            </h2>
            <p class="lv-muted leading-relaxed font-medium mb-8 text-sm">
              We group spots by neighbourhood, sort by time of day, drop them on a map.
              You stop screenshotting TikToks and actually show up.
            </p>
            <div class="flex flex-col gap-4">
              <div v-for="feat in features" :key="feat.label" class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style="background: var(--paper); border: 1px solid var(--hairline);">
                  <i :class="`fa-solid ${feat.icon} text-sm`" style="color:var(--orange-text)"></i>
                </div>
                <span class="text-sm font-bold" style="color:var(--ink)">{{ feat.label }}</span>
              </div>
            </div>
          </div>

          <!-- Visual: vibe pills grid instead of static card -->
          <div class="reveal" style="transition-delay: 0.1s">
            <div class="glass-panel p-8">
              <p class="data-mono text-[10px] uppercase mb-5" style="color:var(--orange-text)">Pick up to 3 vibes</p>
              <div class="grid grid-cols-2 gap-3">
                <div v-for="vibe in [
                  { icon: 'fa-umbrella-beach', label: 'Chill',    sub: 'Pools & slow mornings' },
                  { icon: 'fa-bowl-rice',       label: 'Foodie',   sub: 'Street food & gems' },
                  { icon: 'fa-music',           label: 'Party',    sub: 'Bars & late nights' },
                  { icon: 'fa-camera',          label: 'Photo',    sub: 'Temples & light' },
                  { icon: 'fa-rainbow',         label: 'Gay Vibe', sub: 'Silom · Soi 4' },
                  { icon: 'fa-spa',             label: 'Wellness', sub: 'Spas & rituals' },
                ]" :key="vibe.label"
                  class="vibe-preview-card"
                >
                  <i :class="`fa-solid ${vibe.icon} text-base mb-2`" style="color:var(--orange-text)"></i>
                  <span class="text-[13px] font-black block" style="color:var(--ink)">{{ vibe.label }}</span>
                  <span class="text-[10px] font-bold opacity-50 block mt-0.5 leading-tight" style="color:var(--ink)">{{ vibe.sub }}</span>
                </div>
              </div>
              <button
                class="btn-ios btn-arrow w-full h-12 rounded-lg mt-5 text-sm font-bold"
                @click="router.push('/plan')"
              >
                Choose my vibe <i class="fa-solid fa-arrow-right ml-1.5 btn-arrow-icon"></i>
              </button>
            </div>
          </div>

        </div>
      </div>
    </section>

    <!-- Bottom CTA -->
    <section class="py-20 lg:py-28">
      <div class="max-w-2xl mx-auto px-6">
        <div class="reveal">
          <div class="glass-panel p-10 lg:p-14 text-center relative overflow-hidden">
            <p class="data-mono text-[11px] uppercase mb-4 relative" style="color:var(--orange-text)">Bangkok is waiting</p>
            <h2 class="text-3xl lg:text-4xl display-cond mb-4 leading-tight relative" style="color:var(--ink)">
              Your next trip starts<br>with <span class="accent-cond" style="color:var(--orange-text)">one swipe.</span>
            </h2>
            <p class="lv-muted text-sm font-medium leading-relaxed mb-8 relative">
              Stop saving Instagram reels you'll never open again.<br>
              Just pick a vibe and go.
            </p>
            <button
              class="btn-ios btn-arrow w-full h-14 rounded-lg text-lg font-bold relative"
              @click="router.push('/plan')"
            >
              Plan My Bangkok Trip <i class="fa-solid fa-arrow-right ml-2 btn-arrow-icon"></i>
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="border-t py-12" style="border-color: var(--hairline);">
      <div class="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 mb-8">
          <div>
            <span class="text-2xl display-cond block mb-1" style="color:var(--ink)">
              plz<span style="color:var(--orange-text)">go</span>
            </span>
            <p class="text-xs lv-muted font-bold">Curated by people who actually live in Bangkok.</p>
          </div>
          <div class="flex flex-wrap gap-6">
            <a href="mailto:worapun.ld@gmail.com" class="footer-link">Contact Us</a>
            <router-link to="/privacy" class="footer-link">Privacy Policy</router-link>
            <router-link to="/terms" class="footer-link">Terms of Use</router-link>
          </div>
        </div>
        <div class="flex flex-col md:flex-row items-center justify-between gap-3 pt-6"
          style="border-top: 1px solid var(--hairline);">
          <p class="text-xs lv-muted font-bold">© 2025 plzgo. All rights reserved.</p>
          <div class="flex items-center gap-3 flex-wrap justify-center">
            <span class="version-badge">v0.2 · Beta</span>
            <span class="text-xs lv-muted font-bold">Actively developed · Bangkok only for now</span>
            <span class="text-xs lv-muted">·</span>
            <span class="text-xs lv-muted font-bold">Powered by Copper The Husbear.</span>
          </div>
        </div>
      </div>
    </footer>

  </div>
</template>

<style scoped>
.landing-root {
  min-height: 100vh;
  overflow-x: hidden;
  background: var(--paper);
}
.lv-progress-bar {
  position: fixed;
  top: 0; left: 0;
  height: 3px;
  width: 0%;
  background: var(--line-1);
  z-index: 60;
  pointer-events: none;
}
/* ============ HERO — ink tunnel ============ */
.hero-section {
  position: relative;
  overflow: hidden;
  background: var(--ink);
  padding: clamp(104px, 15vh, 150px) clamp(20px, 5vw, 48px) clamp(56px, 8vw, 90px);
}
.hero-grid {
  position: relative;
  z-index: 1;
  max-width: 1180px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1.12fr 0.88fr;
  gap: clamp(2rem, 5vw, 4.5rem);
  align-items: center;
}
@media (max-width: 980px) {
  .hero-grid { grid-template-columns: 1fr; gap: 3rem; }
}
.lv-muted { color: var(--muted); }

@keyframes marquee-l {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}

/* ── Live chip — departure-board strip, dark variant ── */
.live-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.16);
  border-radius: 999px;
  font-family: 'IBM Plex Mono', monospace;
  font-weight: 500;
  font-size: 10.5px;
  text-transform: uppercase;
  font-variant-numeric: tabular-nums;
  margin-bottom: 22px;
}
.live-dot {
  width: 7px; height: 7px;
  border-radius: 50%;
  background: var(--signal);
  flex-shrink: 0;
}
.live-city { color: #fff; }
.live-time { color: rgba(255,255,255,0.5); }
.live-vibe { color: var(--line-1); }
.live-sep  { color: rgba(255,255,255,0.25); }

/* ── Headline / tagline / sub ── */
.hero-h1 {
  font-size: clamp(2.6rem, 6.4vw, 4.7rem);
  line-height: 1.05;
  letter-spacing: -0.02em;
  color: #fff;
  margin: 0 0 14px;
}
.hero-accent { color: var(--line-1); }
.hero-tagline {
  font-size: clamp(0.8rem, 1.5vw, 0.95rem);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--line-1);
  min-height: 1.6em;
  margin: 0 0 18px;
}
.hero-sub {
  font-size: clamp(0.95rem, 1.3vw, 1.08rem);
  line-height: 1.8;
  color: rgba(255,255,255,0.62);
  max-width: 46ch;
  margin: 0 0 28px;
  font-weight: 500;
}
.hero-cta { margin-bottom: 30px; }
.hero-cta-btn {
  height: 56px;
  padding: 0 34px;
  border-radius: 10px;
  font-size: 17px;
}

/* ── Stat chips ── */
.hero-stats {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.hstat {
  border: 1px solid rgba(255,255,255,0.16);
  background: rgba(255,255,255,0.04);
  border-radius: 12px;
  padding: 10px 16px;
}
.hstat b {
  display: block;
  font-family: 'IBM Plex Mono', monospace;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  font-size: 22px;
  line-height: 1.15;
  color: var(--line-1);
}
.hstat b sup {
  font-size: 12px;
  vertical-align: top;
  line-height: 1.8;
  margin-left: 1px;
}
.hstat span {
  font-family: 'IBM Plex Mono', monospace;
  font-weight: 500;
  font-size: 9.5px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.45);
}
.hero-line {
  display: block;
  line-height: 1.08;
  padding-bottom: 0.06em;
  overflow: hidden;
}
.hero-line > span {
  display: inline-block;
  transform: translateY(112%);
  transition: transform 0.9s cubic-bezier(.2,.75,.2,1);
}
.hero-line.in > span { transform: none; }
.hero-line:nth-of-type(2) > span { transition-delay: 0.1s; }

/* ============ HERO DEMO DECK ============ */
.hero-deck { position: relative; }
.deck-sway {
  animation: heroSway 7s ease-in-out infinite;
  transform-origin: top center;
}
@keyframes heroSway {
  0%, 100% { transform: rotate(-0.7deg); }
  50%      { transform: rotate(0.7deg); }
}
.deck-stage {
  position: relative;
  width: min(320px, 82vw);
  aspect-ratio: 3 / 4;
  margin: 0 auto;
  /* pan-y, not none — the deck sits in the hero, and `none` would trap the
     page: anyone starting a scroll with their thumb on the card couldn't
     move down the page. We only claim the horizontal axis. */
  touch-action: pan-y;
}
.demo-card {
  position: absolute;
  inset: 0;
  border-radius: 14px;
  overflow: hidden;
  background: #fff;
  box-shadow: var(--shadow-deep);
  display: flex;
  flex-direction: column;
  user-select: none;
  -webkit-user-select: none;
  will-change: transform;
}
.demo-card-front { cursor: grab; }
.demo-card-front:active { cursor: grabbing; }

/* Station-sign face — colour encodes the place type, no photo needed */
.demo-face {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #fff;
}
.demo-face-icon { font-size: 46px; opacity: 0.9; }
.demo-face-type {
  font-size: 10px;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  opacity: 0.85;
}
.demo-body {
  flex: 0 0 auto;
  padding: 16px 18px 18px;
  border-top: 1px solid var(--hairline);
  background: #fff;
}
.demo-name {
  font-size: 19px;
  line-height: 1.15;
  color: var(--ink);
  margin: 0 0 4px;
}
.demo-zone {
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
  margin: 0 0 10px;
}
.demo-vibes { display: flex; gap: 5px; flex-wrap: wrap; }
.demo-vibe {
  font-size: 9px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 3px 9px;
  border-radius: 999px;
  border: 1px solid var(--hairline);
  color: var(--muted);
}
.demo-skeleton {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.12);
  box-shadow: none;
}

/* Stamps — heavy, rotated, driven by drag distance */
.demo-stamp {
  position: absolute;
  top: 22px;
  font-size: 26px;
  letter-spacing: 0.06em;
  padding: 6px 16px;
  border: 4px solid;
  border-radius: 6px;
  background: rgba(255,255,255,0.9);
  pointer-events: none;
  z-index: 5;
}
.demo-stamp-yep  { left: 16px;  color: var(--line-2); border-color: var(--line-2); transform: rotate(-13deg); }
.demo-stamp-nope { right: 16px; color: var(--ink);    border-color: var(--ink);    transform: rotate(13deg); }

/* Deck controls */
.deck-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-top: 22px;
}
.dbtn {
  width: 52px; height: 52px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 19px;
  border: 2px solid;
  cursor: pointer;
  transition: transform 0.2s ease-out, box-shadow 0.2s ease-out;
}
.dbtn:hover { transform: scale(1.1); }
.dbtn-pass {
  color: rgba(255,255,255,0.7);
  border-color: rgba(255,255,255,0.28);
  background: transparent;
}
.dbtn-pass:hover { color: #fff; border-color: rgba(255,255,255,0.6); }
.dbtn-like {
  color: #fff;
  background: var(--line-1);
  border-color: var(--line-1);
}
.dbtn-like:hover { box-shadow: 0 10px 26px -8px rgba(255,140,66,0.7); }
.dcount {
  text-align: center;
  font-size: 9.5px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.45);
  min-width: 86px;
}
.dcount b {
  display: block;
  font-size: 22px;
  letter-spacing: 0;
  color: #fff;
  line-height: 1.2;
}
.hero-trail { margin-top: 18px; }
.hero-trail-more {
  background: var(--line-1);
  border-color: var(--line-1);
}
.deck-hint {
  font-size: 9.5px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.4);
  margin: 0;
}
/* Payoff line — appears once the demo has proved the point */
.deck-cta {
  margin: 16px auto 0;
  max-width: 300px;
  text-align: center;
  font-family: 'IBM Plex Sans Condensed', sans-serif;
  font-weight: 700;
  font-size: 13px;
  color: var(--ink);
  background: var(--signal);
  border-radius: 10px;
  padding: 10px 14px;
  opacity: 0;
  transform: translateY(8px) scale(0.94);
  transition: all 0.45s cubic-bezier(.2,.8,.3,1.3);
  pointer-events: none;
}
.deck-cta.show { opacity: 1; transform: none; }

@media (prefers-reduced-motion: reduce) {
  .deck-sway { animation: none; }
}

/* ============ MARQUEE ============ */
.marquee-section {
  padding: 64px 0 56px;
}
.marquee-header {
  text-align: center;
  padding: 0 24px;
  margin-bottom: 36px;
}

/* Edge fade — clips overflow AND fades sides */
.marquee-track {
  overflow: hidden;
  mask-image: linear-gradient(90deg, transparent 0%, #000 7%, #000 93%, transparent 100%);
  -webkit-mask-image: linear-gradient(90deg, transparent 0%, #000 7%, #000 93%, transparent 100%);
}
/* Pause both rows when hovering anywhere on the track */
.marquee-track:hover .marquee-inner {
  animation-play-state: paused;
}

.marquee-row {
  overflow: visible;
  width: 100%;
}
.marquee-inner {
  display: flex;
  gap: 10px;
  width: max-content;
  will-change: transform;
}
.marquee-l1 { animation: marquee-l 52s linear infinite; }
.marquee-l2 { animation: marquee-l 72s linear infinite; }

/* Single clean pill — station dot + name, flat */
.place-chip {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 11px 20px;
  background: #fff;
  border: 1px solid var(--hairline);
  border-radius: 999px;
  white-space: nowrap;
  flex-shrink: 0;
  cursor: default;
}
.chip-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #fff;
  border: 3px solid var(--dot-color, var(--line-1));
  box-sizing: content-box;
  flex-shrink: 0;
}
.chip-name {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--ink);
  line-height: 1;
}

/* ============ KILL GRID (Stop using ___) ============ */
.kill-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  max-width: 640px;
  margin: 0 auto;
}
@media (min-width: 640px) {
  .kill-grid { grid-template-columns: 1fr 1fr; }
}

.kill-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 20px;
  background: #fff;
  border: 1px solid var(--hairline);
  border-radius: 8px;
  transition: border-color 0.15s, transform 0.2s ease-out, box-shadow 0.2s ease-out;
}
.kill-card:hover { border-color: var(--ink); transform: translateY(-3px); box-shadow: var(--shadow-md); }

.kill-icon {
  width: 38px;
  height: 38px;
  border-radius: 8px;
  background: var(--paper);
  border: 1px solid var(--hairline);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 14px;
  color: var(--muted);
}

.kill-text {
  flex: 1;
  min-width: 0;
}
/* Struck-through like a cancelled service on a departure board — the line
   sweeps in when its card reveals, instead of sitting there pre-crossed-out. */
.kill-strike {
  font-size: 14px;
  font-weight: 700;
  color: var(--muted);
  line-height: 1.35;
  position: relative;
  display: inline;
}
.kill-strike::after {
  content: '';
  position: absolute;
  left: 0; top: 55%;
  height: 2px; width: 0;
  background: var(--line-1);
  transition: width 0.7s cubic-bezier(.2,.7,.2,1);
  transition-delay: 0.15s;
}
.kill-card.in .kill-strike::after { width: 100%; }

.kill-cta {
  text-align: center;
  margin-top: 40px;
}
.kill-arrow {
  color: var(--orange-text);
  font-size: 18px;
  margin-bottom: 14px;
}
.kill-resolution {
  font-family: 'IBM Plex Sans Condensed', 'IBM Plex Sans Thai', sans-serif;
  font-weight: 700;
  font-size: clamp(20px, 4vw, 28px);
  color: var(--ink);
}

/* ============ LOGO DOT ============ */
.logo-dot {
  display: inline-block;
  width: 5px; height: 5px;
  background: var(--line-1);
  border-radius: 50%;
  margin-left: 1px;
  position: relative;
  top: -6px;
  flex-shrink: 0;
}

/* Accent inside condensed headlines — line-1 color, no serif */
.accent-cond {
  color: var(--orange-text);
}

/* Scroll reveal — LandingView-only exception to the "instant state" rule.
   This is the one-time marketing entry screen, not a repeated-use tool
   surface, so narrative pacing earns its keep here. Every other view
   (SwipeView/ResultView/HomeView/RouteView) stays instant. */
.reveal {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 0.7s cubic-bezier(.2,.7,.2,1), transform 0.7s cubic-bezier(.2,.7,.2,1);
}
.reveal.in {
  opacity: 1;
  transform: none;
}
@media (prefers-reduced-motion: reduce) {
  .reveal, .hero-line > span {
    transition: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
}

/* ============ STEP CARDS ============ */
.step-card {
  position: relative;
  overflow: hidden;
}
.step-number-deco {
  position: absolute;
  top: 18px; right: 22px;
  font-family: 'IBM Plex Mono', monospace;
  font-weight: 500;
  font-size: 38px;
  line-height: 1;
  color: var(--hairline);
  pointer-events: none;
  user-select: none;
}

/* ============ VIBE PREVIEW GRID ============ */
.vibe-preview-card {
  background: #fff;
  border: 1px solid var(--hairline);
  border-radius: 8px;
  padding: 16px;
  transition: border-color 0.15s, transform 0.2s ease-out, box-shadow 0.2s ease-out;
  cursor: default;
}
.vibe-preview-card:hover { border-color: var(--ink); transform: translateY(-3px); box-shadow: var(--shadow-md); }

/* ============ BUTTON MICRO ============ */
.btn-arrow-icon {
  display: inline-block;
}

/* Nav — underline draws in on hover */
.nav-link-active {
  position: relative;
  color: var(--ink);
  background: none; border: none; cursor: pointer;
  transition: color 0.2s; padding: 0;
  font-family: 'IBM Plex Sans Thai', sans-serif;
}
.nav-link-active::after {
  content: '';
  position: absolute;
  left: 0; bottom: -3px;
  height: 2px; width: 0;
  background: var(--orange-text);
  transition: width 0.25s ease-out;
}
.nav-link-active:hover { color: var(--orange-text); }
.nav-link-active:hover::after { width: 100%; }
.nav-link-soon {
  color: var(--muted);
  cursor: default;
  display: flex; align-items: center; gap: 6px;
}
.soon-badge {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 9px; font-weight: 500;
  text-transform: uppercase;
  padding: 2px 7px; border-radius: 999px;
  background: #fff; border: 1px solid var(--hairline); color: var(--muted);
}

/* Footer */
.footer-link {
  font-size: 13px; font-weight: 700;
  color: var(--muted);
  text-decoration: none;
  transition: color 0.2s;
}
.footer-link:hover { color: var(--ink); }
.version-badge {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 10px; font-weight: 500;
  text-transform: uppercase;
  padding: 3px 9px; border-radius: 999px;
  background: #fff; color: var(--orange-text);
  border: 1px solid var(--line-1);
}
</style>
