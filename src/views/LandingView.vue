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
  } catch (e) {
    // silently fail — marquee is decorative
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

    <!-- Hero — flat map paper, no stock photography -->
    <section class="hero-section relative flex items-center justify-center overflow-hidden">
      <div class="relative z-10 text-center px-6 max-w-4xl mx-auto">
        <div class="hero-eyebrow live-chip">
          <span class="live-dot"></span>
          <span class="live-city">BANGKOK</span>
          <span class="live-sep">·</span>
          <span class="live-time">{{ bkkTimeLabel }}</span>
          <span class="live-sep">·</span>
          <span class="live-vibe">{{ bkkVibeNow }}</span>
        </div>
        <h1 class="display-cond mb-6" style="font-size: clamp(2.8rem, 8vw, 5.5rem); color: var(--ink);">
          <span class="hero-line"><span>Stop overthinking.</span></span>
          <span class="hero-line"><span class="accent-cond" style="color:var(--orange-text)">Just go.</span></span>
        </h1>
        <p class="hero-sub font-medium leading-relaxed mb-8 mx-auto"
          style="font-size: clamp(1rem, 2.5vw, 1.15rem); max-width: 480px; color: var(--muted);">
          Swipe Bangkok spots. Get a map-optimised route. Share it with one link.
          No spreadsheets. No Pinterest boards. Just vibes.
        </p>
        <div class="hero-cta flex flex-col items-center gap-3">
          <button
            class="btn-ios btn-arrow h-14 px-10 rounded-lg text-lg font-bold"
            @click="router.push('/plan')"
          >
            Start Swiping <i class="fa-solid fa-arrow-right ml-2 btn-arrow-icon"></i>
          </button>
          <p class="data-mono text-[11px] uppercase" style="color:var(--muted)">
            Free · No sign-up · Works on any phone
          </p>
        </div>
        <div class="hero-stats">
          <div class="stats-strip">
            <div class="stat-item" v-for="stat in heroStats" :key="stat.label">
              <div class="stat-num">{{ stat.value }}<sup v-if="stat.suffix">{{ stat.suffix }}</sup></div>
              <div class="stat-label">{{ stat.label }}</div>
            </div>
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
.hero-section {
  min-height: 100svh;
  padding-top: 64px;
  padding-bottom: 60px;
}
.lv-muted { color: var(--muted); }

@keyframes marquee-l {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}

.hero-eyebrow {
  margin-bottom: 20px;
}

/* ── Live chip — flat departure-board strip ── */
.live-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #fff;
  border: 1px solid var(--hairline);
  border-radius: 999px;
  font-family: 'IBM Plex Mono', monospace;
  font-weight: 500;
  font-size: 10.5px;
  text-transform: uppercase;
  font-variant-numeric: tabular-nums;
}
.live-dot {
  width: 7px; height: 7px;
  border-radius: 50%;
  background: var(--line-2);
  flex-shrink: 0;
}
.live-city { color: var(--ink); }
.live-time { color: var(--muted); }
.live-vibe { color: var(--orange-text); }
.live-sep  { color: var(--hairline); }
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

/* ============ STATS STRIP ============ */
.stats-strip {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  max-width: 360px;
  margin: 32px auto 0;
  padding-top: 24px;
  border-top: 1px solid var(--hairline);
  text-align: left;
}
.stat-num {
  font-family: 'IBM Plex Mono', monospace;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  font-size: 26px;
  line-height: 1;
  color: var(--ink);
}
.stat-num sup {
  font-size: 13px;
  color: var(--orange-text);
  margin-left: 1px;
  vertical-align: top;
  line-height: 1.6;
}
.stat-label {
  font-family: 'IBM Plex Mono', monospace;
  font-weight: 500;
  font-size: 10px;
  text-transform: uppercase;
  color: var(--muted);
  margin-top: 5px;
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

/* Nav */
.nav-link-active {
  color: var(--ink);
  background: none; border: none; cursor: pointer;
  transition: color 0.2s; padding: 0;
  font-family: 'IBM Plex Sans Thai', sans-serif;
}
.nav-link-active:hover { color: var(--orange-text); }
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
