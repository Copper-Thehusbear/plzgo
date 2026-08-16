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

// Vibe chips in the "what you get" section — hover/tap swaps the panel copy.
const vibeList = [
  { k: 'Chill',    d: 'Slow mornings, long coffees, rooftop with nowhere to be.' },
  { k: 'Foodie',   d: 'Street stalls to Michelin. The queue is part of the plan.' },
  { k: 'Luxe',     d: 'Rooftops, spas, the room with the view. Go on, you earned it.' },
  { k: 'Local',    d: 'Where people who live here actually eat on a Tuesday.' },
  { k: 'Trendy',   d: 'The new opening everyone posts before they explain it.' },
  { k: 'Lively',   d: 'Loud, late, crowded, worth it. Sleep is for the flight.' },
  { k: 'Cultural', d: 'Temples and palaces that are still working buildings.' },
  { k: 'Photo',    d: 'Golden hour spots and the angle nobody else queues for.' },
  { k: 'Gay Vibe', d: 'Silom Soi 4, Duangthawee, and the bars worth the taxi.' },
  { k: 'Wellness', d: 'Massage, sauna, the reset button for a walked-out day.' },
]
const activeVibe = ref(0)

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
        <span class="lv-logo display-cond flex-shrink-0">
          plz<span>go</span>
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
        <p class="plz-eyebrow" style="justify-content:center">Real Bangkok spots</p>
        <h2 class="text-2xl lg:text-3xl display-cond" style="color:var(--ink)">
          483 places. Handpicked. <span class="accent-cond">Not AI-hallucinated.</span>
        </h2>
      </div>

      <!-- Two solid bands running opposite tones — a graphic break, not a row
           of quiet chips. Real place names, straight from the pool. -->
      <div class="band band-orange">
        <div class="band-track band-l1">
          <template v-for="pass in 2" :key="'r1-' + pass">
            <span v-for="place in marqueeRow1" :key="place.id + '-r1-' + pass" class="band-item display-cond">
              {{ place.name_en }}<i class="band-sep">◆</i>
            </span>
          </template>
        </div>
      </div>
      <div class="band band-ink">
        <div class="band-track band-l2">
          <template v-for="pass in 2" :key="'r2-' + pass">
            <span v-for="place in marqueeRow2" :key="place.id + '-r2-' + pass" class="band-item display-cond">
              {{ place.name_en }}<i class="band-sep">◆</i>
            </span>
          </template>
        </div>
      </div>
    </section>

    <!-- Stop Using ___ — a desk full of tabs you can finally throw away -->
    <section class="sec-pad">
      <span class="plz-secnum sec-num">01</span>
      <div class="max-w-5xl mx-auto px-4 md:px-6 lg:px-8 relative">
        <div class="mb-14 reveal">
          <p class="plz-eyebrow">A short intervention</p>
          <h2 class="sec-h2 display-cond">
            You can stop<br>
            <span class="accent-cond">doing all this now.</span>
          </h2>
        </div>

        <div class="kill-scatter">
          <div v-for="(item, i) in replacements" :key="item.kill"
            class="kill-note plz-taped reveal"
            :style="{
              transitionDelay: i * 0.05 + 's',
              '--rot': [-4, 3, -2.5, 4, -3, 2.5][i] + 'deg',
              marginTop: [0, 26, 10, 32, 4, 22][i] + 'px'
            }"
          >
            <div class="kill-icon">
              <i :class="`fa-solid ${item.icon}`"></i>
            </div>
            <span class="kill-strike">{{ item.kill }}</span>
          </div>
        </div>

        <div class="kill-cta reveal" style="transition-delay: 0.28s">
          <span class="kill-stamp display-cond">= Decision paralysis</span>
          <p class="kill-resolution display-cond">
            We did the work. <span class="accent-cond">Just swipe.</span>
          </p>
        </div>
      </div>
    </section>

    <!-- How it works — the pipeline, then the detail -->
    <section class="sec-pad">
      <span class="plz-secnum sec-num">02</span>
      <div class="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 relative">
        <div class="mb-10 reveal">
          <p class="plz-eyebrow">How it works</p>
          <h2 class="sec-h2 display-cond">
            Three steps. <span class="accent-cond">Zero stress.</span>
          </h2>
        </div>

        <!-- Signal travelling down the line, station to station -->
        <div class="flow reveal">
          <div class="flow-node"><small>Step 01</small>Pick your vibe</div>
          <div class="flow-line"><i></i></div>
          <div class="flow-node"><small>Step 02</small>Swipe spots</div>
          <div class="flow-line"><i style="animation-delay:.8s"></i></div>
          <div class="flow-node"><small>Step 03</small>Get your route</div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div v-for="step in steps" :key="step.n"
            class="step-card reveal"
            :style="{ transitionDelay: (step.n - 1) * 0.08 + 's' }"
          >
            <div class="step-number-deco display-cond">{{ String(step.n).padStart(2, '0') }}</div>
            <i :class="`fa-solid ${step.icon} step-icon`"></i>
            <h3 class="step-title display-cond">{{ step.title }}</h3>
            <p class="step-desc">{{ step.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- What you get — dark chapter, sticky thesis on the left -->
    <section class="sec-pad sec-dark plz-dotgrid">
      <span class="plz-secnum plz-secnum-light sec-num">03</span>
      <div class="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 relative sticky2">

        <div class="sticky-left reveal">
          <p class="plz-eyebrow plz-eyebrow-light">What you get</p>
          <h2 class="sec-h2 sec-h2-light display-cond">
            A plan so solid, your friends<br>will think <span class="accent-light">you live here.</span>
          </h2>
          <p class="sec-lead">
            We group spots by neighbourhood, sort by time of day, drop them on a map.
            You stop screenshotting TikToks and actually show up.
          </p>
          <ul class="feat-list">
            <li v-for="feat in features" :key="feat.label">
              <i :class="`fa-solid ${feat.icon}`"></i>
              <span>{{ feat.label }}</span>
            </li>
          </ul>
        </div>

        <div class="reveal" style="transition-delay:.1s">
          <div class="stat-row">
            <div class="stat-box">
              <b>483</b><span>Places curated</span>
            </div>
            <div class="stat-box">
              <b>8</b><span>Place types</span>
            </div>
            <div class="stat-box">
              <b>0</b><span>Sign-ups</span>
            </div>
          </div>

          <div class="stat-box fill-box">
            <span>Text fields complete after the last data pass</span>
            <div class="fillbar"><i></i></div>
            <b>100%</b>
          </div>

          <p class="plz-eyebrow plz-eyebrow-light mt-8">Ten vibes — try one</p>
          <div class="vibe-grid">
            <button
              v-for="(v, i) in vibeList"
              :key="v.k"
              class="vibe-chip data-mono"
              :class="{ act: activeVibe === i }"
              @mouseenter="activeVibe = i"
              @focus="activeVibe = i"
              @click="activeVibe = i"
            >{{ v.k }}</button>
          </div>
          <div class="vibe-panel">
            <b class="display-cond">{{ vibeList[activeVibe].k }}</b>
            <p>{{ vibeList[activeVibe].d }}</p>
          </div>

          <button class="btn-ios btn-arrow vibe-cta" @click="router.push('/plan')">
            Choose my vibe <i class="fa-solid fa-arrow-right ml-1.5 btn-arrow-icon"></i>
          </button>
        </div>

      </div>
    </section>

    <!-- Closing -->
    <section class="sec-pad sec-closing plz-dotgrid plz-glow">
      <div class="max-w-5xl mx-auto px-4 md:px-6 lg:px-8 relative">
        <p class="plz-eyebrow plz-eyebrow-light reveal">Bangkok is waiting</p>
        <h2 class="close-big display-cond">
          <span class="hero-line"><span>Your next trip starts</span></span>
          <span class="hero-line"><span>with <em class="accent-light">one swipe.</em></span></span>
        </h2>
        <p class="close-p reveal" style="transition-delay:.15s">
          Stop saving Instagram reels you'll never open again. Pick a vibe, swipe
          what looks good, and walk out with a route that a local would actually walk.
        </p>
        <div class="sig reveal" style="transition-delay:.22s">
          <span class="sig-line"></span>
          <b class="display-cond">Free · No sign-up · Bangkok only, for now</b>
        </div>
        <button class="go-btn display-cond reveal" style="transition-delay:.28s" @click="router.push('/plan')">
          Plan my Bangkok trip →
        </button>
      </div>
    </section>

    <!-- Footer -->
    <footer class="lv-footer">
      <div class="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 mb-8">
          <div>
            <span class="text-2xl display-cond block mb-1" style="color:#fff">
              plz<span style="color:var(--line-1)">go</span>
            </span>
            <p class="lv-foot-tag">Curated by people who actually live in Bangkok.</p>
          </div>
          <div class="flex flex-wrap gap-6">
            <a href="mailto:worapun.ld@gmail.com" class="footer-link">Contact Us</a>
            <router-link to="/privacy" class="footer-link">Privacy Policy</router-link>
            <router-link to="/terms" class="footer-link">Terms of Use</router-link>
          </div>
        </div>
        <div class="lv-foot-bar">
          <span>© 2025 <b>PLZGO.ME</b> — All rights reserved</span>
          <span>v0.2 Beta · Actively developed · Powered by Copper The Husbear</span>
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

/* Two solid tone bands — a hard graphic break between chapters */
.band {
  overflow: hidden;
  padding: 12px 0;
}
.band-orange {
  background: var(--line-1);
  border-top: 3px solid var(--ink);
  border-bottom: 3px solid var(--ink);
}
.band-ink {
  background: var(--ink);
  border-bottom: 3px solid var(--ink);
}
.band-track {
  display: flex;
  width: max-content;
  white-space: nowrap;
  will-change: transform;
}
.band:hover .band-track { animation-play-state: paused; }
.band-l1 { animation: marquee-l 62s linear infinite; }
.band-l2 { animation: marquee-l 86s linear infinite; }
.band-item {
  font-size: 16px;
  letter-spacing: 0.01em;
  display: inline-flex;
  align-items: center;
}
.band-orange .band-item { color: var(--ink); }
.band-ink .band-item    { color: var(--paper); }
.band-sep {
  font-style: normal;
  margin: 0 18px;
  font-size: 9px;
  opacity: 0.5;
  transform: translateY(-2px);
}

/* ============ SECTION SHELL ============ */
.sec-pad {
  position: relative;
  padding: clamp(72px, 10vw, 124px) 0;
}
.sec-num { top: clamp(28px, 5vw, 56px); right: clamp(10px, 4vw, 48px); }
.sec-h2 {
  font-size: clamp(2rem, 4.6vw, 3.1rem);
  line-height: 1.08;
  letter-spacing: -0.015em;
  color: var(--ink);
  margin: 0;
}
.sec-dark { background: var(--ink); overflow: hidden; }
.sec-h2-light { color: #fff; }
.accent-light { color: var(--line-1); font-style: normal; }
.sec-lead {
  font-size: clamp(0.95rem, 1.3vw, 1.05rem);
  line-height: 1.85;
  color: rgba(255,255,255,0.6);
  max-width: 52ch;
  margin: 18px 0 0;
}

/* ============ KILL NOTES (Stop using ___) ============ */
/* A pile of browser tabs someone finally threw on the desk. Rotation and
   vertical offset come per-card from the template so the grid reads as
   scattered without absolute positioning (which breaks on small screens). */
.kill-scatter {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  max-width: 660px;
  margin: 0 auto;
}
@media (min-width: 640px) {
  .kill-scatter { grid-template-columns: 1fr 1fr; gap: 22px 26px; }
}
.kill-note {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  background: #fff;
  border: 1px solid var(--hairline);
  border-radius: 4px;
  box-shadow: var(--shadow-lift);
  transform: rotate(var(--rot, 0deg));
  transition: transform 0.35s cubic-bezier(.2,.8,.3,1.2), box-shadow 0.35s;
}
.kill-note:hover {
  transform: rotate(0deg) translateY(-6px);
  box-shadow: var(--shadow-lift), 0 0 0 1px var(--ink);
}
/* These notes are both .reveal and rotated, and .reveal/.reveal.in each set
   transform — so both states must re-state the rotation or the cards snap
   flat the moment they finish revealing. */
.kill-note.reveal:not(.in) { transform: translateY(24px) rotate(var(--rot, 0deg)); }
.kill-note.reveal.in       { transform: rotate(var(--rot, 0deg)); }
.kill-note.reveal.in:hover { transform: rotate(0deg) translateY(-6px); }

.kill-icon {
  width: 38px;
  height: 38px;
  border-radius: 6px;
  background: var(--paper);
  border: 1px solid var(--hairline);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 14px;
  color: var(--muted);
}
/* Struck through like a cancelled service — the line sweeps in on reveal */
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
  background: var(--line-3);
  transition: width 0.7s cubic-bezier(.2,.7,.2,1);
  transition-delay: 0.2s;
}
.kill-note.in .kill-strike::after { width: 100%; }

.kill-cta {
  text-align: center;
  margin-top: 56px;
}
/* The diagnosis, stamped */
.kill-stamp {
  display: inline-block;
  font-size: clamp(15px, 2.6vw, 20px);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--line-3);
  border: 3px solid var(--line-3);
  padding: 8px 20px;
  transform: rotate(-3deg);
  background: #fff;
  box-shadow: var(--shadow-md);
}
.kill-resolution {
  font-size: clamp(22px, 4.4vw, 32px);
  color: var(--ink);
  margin-top: 30px;
}

/* ============ WORDMARK ============ */
/* Matches ExploreView's .logo exactly — same weight, tracking and the
   brighter --line-1 on "go". No trailing dot. */
.lv-logo {
  font-size: 24px;
  font-weight: 900;
  letter-spacing: -0.04em;
  color: var(--ink);
  cursor: pointer;
}
.lv-logo span { color: var(--line-1); }

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

/* ============ FLOW — signal running down the line ============ */
.flow {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0;
  margin: 0 0 48px;
}
.flow-node {
  background: var(--ink);
  color: #fff;
  font-family: 'IBM Plex Sans Condensed', sans-serif;
  font-weight: 700;
  font-size: 15px;
  padding: 14px 22px;
  border-radius: 10px;
  transition: transform 0.25s ease-out, box-shadow 0.25s ease-out;
}
.flow-node:hover { transform: translateY(-4px); box-shadow: var(--shadow-md); }
.flow-node small {
  display: block;
  font-family: 'IBM Plex Mono', monospace;
  font-weight: 500;
  font-size: 9px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--line-1);
  margin-bottom: 2px;
}
.flow-line {
  width: clamp(28px, 7vw, 92px);
  height: 2px;
  background: repeating-linear-gradient(90deg, var(--line-1) 0 8px, transparent 8px 14px);
  position: relative;
}
.flow-line i {
  position: absolute;
  top: -4px; left: 0;
  width: 10px; height: 10px;
  border-radius: 50%;
  background: var(--line-1);
  animation: flowdot 1.8s linear infinite;
}
@keyframes flowdot { from { left: 0; } to { left: calc(100% - 10px); } }
@media (max-width: 620px) {
  .flow { flex-direction: column; gap: 10px; }
  .flow-line { width: 2px; height: 26px; background: repeating-linear-gradient(180deg, var(--line-1) 0 8px, transparent 8px 14px); }
  .flow-line i { animation: none; top: 0; left: -4px; }
}

/* ============ STEP CARDS ============ */
.step-card {
  position: relative;
  overflow: hidden;
  background: #fff;
  border: 1px solid var(--hairline);
  border-radius: 8px;
  padding: 28px 26px 26px;
  box-shadow: var(--shadow-sm);
  transition: transform 0.25s ease-out, box-shadow 0.25s ease-out;
}
.step-card:hover { transform: translateY(-5px); box-shadow: var(--shadow-md); }
.step-number-deco {
  position: absolute;
  top: 10px; right: 16px;
  font-size: 68px;
  line-height: 1;
  letter-spacing: -0.04em;
  color: var(--ink);
  opacity: 0.06;
  pointer-events: none;
  user-select: none;
}
.step-icon {
  font-size: 22px;
  color: var(--orange-text);
  display: block;
  margin-bottom: 18px;
}
.step-title {
  font-size: 20px;
  color: var(--ink);
  margin: 0 0 8px;
  position: relative;
}
.step-desc {
  font-size: 13.5px;
  line-height: 1.7;
  color: var(--muted);
  margin: 0;
  position: relative;
}

/* ============ DARK CHAPTER: stats, fill bar, vibe chips ============ */
.sticky2 {
  display: grid;
  grid-template-columns: 0.92fr 1.08fr;
  gap: clamp(2rem, 5vw, 4.5rem);
}
@media (max-width: 980px) { .sticky2 { grid-template-columns: 1fr; } }
.sticky-left { position: sticky; top: 100px; align-self: start; }
@media (max-width: 980px) { .sticky-left { position: static; } }

.feat-list { list-style: none; margin: 26px 0 0; padding: 0; }
.feat-list li {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px dashed rgba(255,255,255,0.14);
  font-size: 14px;
  font-weight: 600;
  color: rgba(255,255,255,0.9);
}
.feat-list li:last-child { border-bottom: none; }
.feat-list i { color: var(--line-1); font-size: 13px; width: 18px; flex: none; }

.stat-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 12px;
}
.stat-box {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.14);
  border-radius: 12px;
  padding: 16px 18px;
}
.stat-box b {
  display: block;
  font-family: 'IBM Plex Mono', monospace;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  font-size: clamp(1.5rem, 3vw, 2rem);
  line-height: 1.15;
  color: var(--line-1);
}
.stat-box span {
  font-family: 'IBM Plex Mono', monospace;
  font-weight: 500;
  font-size: 9.5px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.45);
}
.fill-box b { font-size: 1.4rem; }
.fillbar {
  height: 8px;
  background: rgba(255,255,255,0.08);
  border-radius: 99px;
  overflow: hidden;
  margin: 10px 0 6px;
}
.fillbar i {
  display: block;
  height: 100%;
  width: 0;
  background: var(--line-1);
  border-radius: 99px;
  transition: width 1.8s cubic-bezier(.2,.7,.2,1) 0.3s;
}
.reveal.in .fillbar i { width: 100%; }

.vibe-grid { display: flex; flex-wrap: wrap; gap: 8px; margin: 14px 0 16px; }
.vibe-chip {
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 9px 15px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.18);
  background: transparent;
  color: rgba(255,255,255,0.75);
  cursor: pointer;
  transition: all 0.2s ease-out;
}
.vibe-chip:hover, .vibe-chip.act {
  background: var(--line-1);
  border-color: var(--line-1);
  color: #fff;
  transform: translateY(-2px);
  font-weight: 700;
}
.vibe-panel {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.14);
  border-left: 4px solid var(--line-1);
  border-radius: 10px;
  padding: 16px 18px;
  min-height: 86px;
}
.vibe-panel b {
  font-size: 17px;
  color: var(--line-1);
  letter-spacing: 0.02em;
}
.vibe-panel p {
  font-size: 14px;
  line-height: 1.6;
  color: rgba(255,255,255,0.6);
  margin: 4px 0 0;
}
.vibe-cta {
  width: 100%;
  height: 52px;
  border-radius: 10px;
  font-size: 15px;
  margin-top: 20px;
}

/* ============ CLOSING ============ */
.sec-closing {
  background: var(--ink);
  overflow: hidden;
}
.close-big {
  font-size: clamp(1.9rem, 5.2vw, 3.6rem);
  line-height: 1.14;
  letter-spacing: -0.02em;
  color: #fff;
  margin: 14px 0 0;
}
.close-p {
  max-width: 58ch;
  margin-top: 22px;
  color: rgba(255,255,255,0.6);
  font-size: 1rem;
  line-height: 1.9;
}
.sig { margin-top: 30px; display: flex; align-items: center; gap: 16px; }
.sig-line { width: 56px; height: 3px; background: var(--line-1); flex: none; }
.sig b { font-size: 15px; color: #fff; }
.go-btn {
  display: inline-block;
  margin-top: 34px;
  font-size: 17px;
  background: var(--line-1);
  color: #fff;
  border: none;
  padding: 17px 38px;
  border-radius: 999px;
  cursor: pointer;
  transition: transform 0.25s ease-out, box-shadow 0.25s ease-out;
}
.go-btn:hover {
  transform: translateY(-4px);
  box-shadow: 0 16px 40px -10px rgba(255,140,66,0.6);
}

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

/* Footer — darkest band on the page, closes the document */
.lv-footer {
  background: #10192b;
  padding: 44px 0 38px;
  border-top: 3px solid var(--line-1);
}
.lv-foot-tag {
  font-size: 12px;
  font-weight: 600;
  color: rgba(255,255,255,0.45);
}
.footer-link {
  font-size: 13px; font-weight: 700;
  color: rgba(255,255,255,0.6);
  text-decoration: none;
  transition: color 0.2s;
}
.footer-link:hover { color: var(--line-1); }
.lv-foot-bar {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding-top: 22px;
  border-top: 1px solid rgba(255,255,255,0.12);
  font-family: 'IBM Plex Mono', monospace;
  font-size: 9.5px;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.38);
}
.lv-foot-bar b { color: var(--line-1); }
</style>
