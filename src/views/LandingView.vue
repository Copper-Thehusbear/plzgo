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

const typeConfig = {
  food:       { icon: 'fa-bowl-rice',    color: '#FF8C42', bg: 'rgba(255,140,66,0.1)' },
  attraction: { icon: 'fa-camera',       color: '#6B8CBA', bg: 'rgba(107,140,186,0.1)' },
  nightlife:  { icon: 'fa-music',        color: '#9B7FD4', bg: 'rgba(155,127,212,0.1)' },
  market:     { icon: 'fa-store',        color: '#5BAD8F', bg: 'rgba(91,173,143,0.1)' },
  wellness:   { icon: 'fa-spa',          color: '#7BBFBF', bg: 'rgba(123,191,191,0.1)' },
  shopping:   { icon: 'fa-bag-shopping', color: '#E86B8B', bg: 'rgba(232,107,139,0.1)' },
  area:       { icon: 'fa-map-pin',      color: '#9BA8C4', bg: 'rgba(155,168,196,0.1)' },
}

const defaultType = { icon: 'fa-location-dot', color: '#FF8C42', bg: 'rgba(255,140,66,0.1)' }

const marqueeRow1 = ref([])
const marqueeRow2 = ref([])

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

  const observer = new IntersectionObserver(
    (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('in') }),
    { threshold: 0.1 }
  )
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el))
})
onUnmounted(() => {
  if (clockInterval) clearInterval(clockInterval)
})
</script>

<template>
  <div class="landing-root">

    <!-- Nav -->
    <nav class="glass-nav fixed top-0 left-0 right-0 z-50 h-16"
      style="padding-top: max(env(safe-area-inset-top), 0px);">
      <div class="max-w-7xl mx-auto h-full px-4 md:px-6 lg:px-8 flex items-center justify-between gap-6">
        <span class="text-2xl font-black tracking-tighter flex-shrink-0 flex items-center" style="color:var(--navy)">
          plz<span style="color:var(--orange)">go</span><span class="logo-dot"></span>
        </span>
        <div class="hidden md:flex items-center gap-6 flex-1">
          <button class="nav-link-active text-sm font-bold" @click="router.push('/plan')">Plan a Trip</button>
          <button class="nav-link-active text-sm font-bold" @click="router.push('/explore')">Explore</button>
          <span class="nav-link-soon text-sm font-bold">Community <span class="soon-badge">Coming Soon</span></span>
        </div>
        <button
          class="btn-ios btn-arrow h-10 px-6 rounded-full text-sm font-bold shadow-md shadow-orange-500/20 flex-shrink-0"
          @click="router.push('/plan')"
        >
          Get Started <i class="fa-solid fa-arrow-right ml-1.5 btn-arrow-icon"></i>
        </button>
      </div>
    </nav>

    <!-- Hero -->
    <section class="hero-section relative flex items-center justify-center overflow-hidden">
      <img
        src="https://images.unsplash.com/photo-1563492065599-3520f775eeed?auto=format&fit=crop&q=80&w=1920"
        class="absolute inset-0 w-full h-full object-cover"
        style="opacity: 0.22;" alt="Bangkok"
      />
      <div class="absolute inset-0"
        style="background: linear-gradient(180deg, rgba(30,41,59,0.1) 0%, rgba(253,252,248,1) 100%);" />

      <div class="relative z-10 text-center px-6 max-w-4xl mx-auto">
        <div class="hero-eyebrow live-chip">
          <span class="live-dot"></span>
          <span class="live-city">BANGKOK</span>
          <span class="live-sep">·</span>
          <span class="live-time">{{ bkkTimeLabel }}</span>
          <span class="live-sep">·</span>
          <span class="live-vibe">{{ bkkVibeNow }}</span>
        </div>
        <h1 class="font-black tracking-tight mb-6" style="font-size: clamp(2.8rem, 8vw, 5.5rem); color: var(--navy);">
          <span class="hero-line"><span>Stop overthinking.</span></span>
          <span class="hero-line"><span class="fraunces-italic" style="color:var(--orange)">Just go.</span></span>
        </h1>
        <p class="hero-sub text-slate-500 font-medium leading-relaxed mb-8 mx-auto"
          style="font-size: clamp(1rem, 2.5vw, 1.15rem); max-width: 480px;">
          Swipe Bangkok spots. Get a map-optimised route. Share it with one link.
          No spreadsheets. No Pinterest boards. Just vibes.
        </p>
        <div class="hero-cta flex flex-col items-center gap-3">
          <button
            class="btn-ios btn-arrow h-14 px-10 rounded-2xl text-lg font-bold shadow-2xl shadow-orange-500/25"
            @click="router.push('/plan')"
          >
            Start Swiping <i class="fa-solid fa-arrow-right ml-2 btn-arrow-icon"></i>
          </button>
          <p class="text-[11px] text-slate-400 font-bold tracking-wide">
            Free · No sign-up · Works on any phone
          </p>
        </div>
        <div class="hero-stats">
          <div class="stats-strip">
            <div class="stat-item">
              <div class="stat-num">483<sup>+</sup></div>
              <div class="stat-label">Real places</div>
            </div>
            <div class="stat-item">
              <div class="stat-num">30<sup>s</sup></div>
              <div class="stat-label">To a route</div>
            </div>
            <div class="stat-item">
              <div class="stat-num">0</div>
              <div class="stat-label">Sign-ups needed</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Live Marquee -->
    <section v-if="marqueeRow1.length" class="marquee-section">
      <div class="marquee-header reveal">
        <p class="text-[10px] font-black uppercase tracking-[0.2em] mb-2" style="color:var(--orange)">Real Bangkok spots</p>
        <h2 class="text-2xl lg:text-3xl font-black tracking-tight" style="color:var(--navy)">
          483 places. Handpicked. <span class="fraunces-italic">Not AI-hallucinated.</span>
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
          <p class="text-[11px] font-black uppercase tracking-[0.2em] mb-3" style="color:var(--orange)">A short intervention</p>
          <h2 class="text-3xl lg:text-5xl font-black tracking-tight leading-[0.95]" style="color:var(--navy)">
            You can stop<br>
            <span class="fraunces-italic" style="color:var(--orange)">doing all this now.</span>
          </h2>
        </div>

        <div class="kill-grid">
          <div v-for="(item, i) in replacements" :key="item.kill"
            class="kill-card reveal"
            :style="{ transitionDelay: i * 0.06 + 's' }"
          >
            <div class="kill-icon">
              <i :class="`fa-solid ${item.icon}`"></i>
            </div>
            <div class="kill-text">
              <span class="kill-strike">{{ item.kill }}</span>
            </div>
          </div>
        </div>

        <div class="kill-cta reveal" style="transition-delay: 0.4s">
          <p class="kill-arrow"><i class="fa-solid fa-arrow-down"></i></p>
          <p class="kill-resolution">We did the work. <span class="fraunces-italic" style="color:var(--orange)">Just swipe.</span></p>
        </div>
      </div>
    </section>

    <!-- How it works -->
    <section class="py-20 lg:py-28">
      <div class="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <div class="text-center mb-14 reveal">
          <p class="text-[11px] font-black uppercase tracking-[0.2em] mb-3" style="color:var(--orange)">How it works</p>
          <h2 class="text-3xl lg:text-4xl font-black tracking-tight" style="color:var(--navy)">
            Three steps. <span class="fraunces-italic">Zero stress.</span>
          </h2>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div v-for="step in steps" :key="step.n"
            class="reveal"
            :style="{ transitionDelay: (step.n - 1) * 0.12 + 's' }"
          >
            <div class="glass-panel step-card p-8 flex flex-col gap-5">
              <div class="step-number-deco">{{ String(step.n).padStart(2, '0') }}</div>
              <div class="w-12 h-12 rounded-2xl flex items-center justify-center"
                style="background: rgba(255,140,66,0.12);">
                <i :class="`fa-solid ${step.icon} text-xl`" style="color:var(--orange)"></i>
              </div>
              <div>
                <p class="text-[10px] font-black uppercase tracking-widest mb-1.5" style="color:var(--orange)">
                  Step {{ step.n }}
                </p>
                <h3 class="text-lg font-black mb-2" style="color:var(--navy)">{{ step.title }}</h3>
                <p class="text-sm text-slate-500 leading-relaxed font-medium">{{ step.desc }}</p>
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
            <p class="text-[11px] font-black uppercase tracking-[0.2em] mb-3" style="color:var(--orange)">What you get</p>
            <h2 class="text-3xl lg:text-4xl font-black tracking-tight mb-5 leading-tight" style="color:var(--navy)">
              A plan so solid, your friends will think<br><span class="fraunces-italic">you live here.</span>
            </h2>
            <p class="text-slate-500 leading-relaxed font-medium mb-8 text-sm">
              We group spots by neighbourhood, sort by time of day, drop them on a map.
              You stop screenshotting TikToks and actually show up.
            </p>
            <div class="flex flex-col gap-4">
              <div v-for="feat in features" :key="feat.label" class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style="background: rgba(255,140,66,0.1);">
                  <i :class="`fa-solid ${feat.icon} text-sm`" style="color:var(--orange)"></i>
                </div>
                <span class="text-sm font-bold" style="color:var(--navy)">{{ feat.label }}</span>
              </div>
            </div>
          </div>

          <!-- Visual: vibe pills grid instead of static card -->
          <div class="reveal" style="transition-delay: 0.15s">
            <div class="glass-panel p-8">
              <p class="text-[10px] font-black uppercase tracking-widest mb-5" style="color:var(--orange)">Pick up to 3 vibes</p>
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
                  <i :class="`fa-solid ${vibe.icon} text-base mb-2`" style="color:var(--orange)"></i>
                  <span class="text-[13px] font-black block" style="color:var(--navy)">{{ vibe.label }}</span>
                  <span class="text-[10px] font-bold opacity-50 block mt-0.5 leading-tight" style="color:var(--navy)">{{ vibe.sub }}</span>
                </div>
              </div>
              <button
                class="btn-ios btn-arrow w-full h-12 rounded-xl mt-5 text-sm font-bold"
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
            <div class="cta-glow"></div>
            <p class="text-[11px] font-black uppercase tracking-[0.2em] mb-4 relative" style="color:var(--orange)">Bangkok is waiting</p>
            <h2 class="text-3xl lg:text-4xl font-black tracking-tight mb-4 leading-tight relative" style="color:var(--navy)">
              Your next trip starts<br>with <span class="fraunces-italic" style="color:var(--orange)">one swipe.</span>
            </h2>
            <p class="text-slate-500 text-sm font-medium leading-relaxed mb-8 relative">
              Stop saving Instagram reels you'll never open again.<br>
              Just pick a vibe and go.
            </p>
            <button
              class="btn-ios btn-arrow w-full h-14 rounded-2xl text-lg font-bold shadow-xl shadow-orange-500/20 relative"
              @click="router.push('/plan')"
            >
              Plan My Bangkok Trip <i class="fa-solid fa-arrow-right ml-2 btn-arrow-icon"></i>
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="border-t py-12" style="border-color: rgba(255,255,255,0.4);">
      <div class="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 mb-8">
          <div>
            <span class="text-2xl font-black tracking-tighter block mb-1" style="color:var(--navy)">
              plz<span style="color:var(--orange)">go</span>
            </span>
            <p class="text-xs text-slate-400 font-bold">Curated by people who actually live in Bangkok.</p>
          </div>
          <div class="flex flex-wrap gap-6">
            <a href="mailto:worapun.ld@gmail.com" class="footer-link">Contact Us</a>
            <router-link to="/privacy" class="footer-link">Privacy Policy</router-link>
            <router-link to="/terms" class="footer-link">Terms of Use</router-link>
          </div>
        </div>
        <div class="flex flex-col md:flex-row items-center justify-between gap-3 pt-6"
          style="border-top: 1px solid rgba(30,41,59,0.06);">
          <p class="text-xs text-slate-400 font-bold">© 2025 plzgo. All rights reserved.</p>
          <div class="flex items-center gap-3 flex-wrap justify-center">
            <span class="version-badge">v0.2 · Beta</span>
            <span class="text-xs text-slate-400 font-bold">Actively developed · Bangkok only for now</span>
            <span class="text-xs text-slate-300">·</span>
            <span class="text-xs text-slate-400 font-bold">Powered by Copper The Husbear.</span>
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
}
.hero-section {
  min-height: 100svh;
  padding-top: 64px;
  padding-bottom: 60px;
}

/* ============ KEYFRAMES ============ */
@keyframes rise {
  to { opacity: 1; transform: translateY(0); }
}
@keyframes fadeIn {
  to { opacity: 1; }
}
@keyframes dot-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.35; transform: scale(1.7); }
}
@keyframes marquee-l {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}

/* ============ HERO ENTRANCE ============ */
.hero-eyebrow {
  opacity: 0;
  transform: translateY(20px);
  animation: rise 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.05s forwards;
  margin-bottom: 20px;
}

/* ── Live chip ── */
.live-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.95);
  border-radius: 999px;
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  box-shadow: 0 4px 14px rgba(30, 41, 59, 0.06);
  font-size: 10.5px;
  font-weight: 900;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}
.live-dot {
  width: 7px; height: 7px;
  border-radius: 50%;
  background: #34C759;
  box-shadow: 0 0 8px rgba(52, 199, 89, 0.7);
  animation: dot-pulse 2s ease-in-out infinite;
  flex-shrink: 0;
}
.live-city { color: var(--navy); }
.live-time { color: rgba(30, 41, 59, 0.5); font-variant-numeric: tabular-nums; }
.live-vibe { color: var(--orange); }
.live-sep  { color: rgba(30, 41, 59, 0.2); }
.hero-line {
  display: block;
  overflow: hidden;
  line-height: 1.08;
  padding-bottom: 0.06em;
}
.hero-line span {
  display: inline-block;
  transform: translateY(110%);
  animation: rise 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
.hero-line:nth-child(1) span { animation-delay: 0.18s; }
.hero-line:nth-child(2) span { animation-delay: 0.34s; }

.hero-sub {
  opacity: 0;
  transform: translateY(20px);
  animation: rise 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.54s forwards;
}
.hero-cta {
  opacity: 0;
  transform: translateY(20px);
  animation: rise 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.7s forwards;
}
.hero-stats {
  opacity: 0;
  animation: fadeIn 0.8s ease 1s forwards;
}

/* ============ STATS STRIP ============ */
.stats-strip {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  max-width: 360px;
  margin: 32px auto 0;
  padding-top: 24px;
  border-top: 1px solid rgba(30, 41, 59, 0.1);
  text-align: left;
}
.stat-num {
  font-size: 26px;
  font-weight: 900;
  letter-spacing: -0.04em;
  line-height: 1;
  color: var(--navy);
}
.stat-num sup {
  font-size: 13px;
  color: var(--orange);
  font-weight: 800;
  margin-left: 1px;
  vertical-align: top;
  line-height: 1.6;
}
.stat-label {
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgba(30, 41, 59, 0.4);
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

/* Single clean pill — dot + name only */
.place-chip {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 11px 20px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(255, 255, 255, 0.95);
  border-radius: 999px;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 1px 4px rgba(30, 41, 59, 0.06);
  white-space: nowrap;
  flex-shrink: 0;
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease;
  cursor: default;
}
.place-chip:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(30, 41, 59, 0.1);
}
.chip-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--dot-color, var(--orange));
  box-shadow: 0 0 6px var(--dot-color, var(--orange));
  flex-shrink: 0;
}
.chip-name {
  font-size: 13.5px;
  font-weight: 800;
  color: var(--navy);
  letter-spacing: -0.01em;
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
  background: rgba(255, 255, 255, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 16px;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.kill-card:hover {
  transform: translateY(-2px);
  background: rgba(255, 255, 255, 0.75);
  box-shadow: 0 8px 20px rgba(30, 41, 59, 0.06);
}

.kill-icon {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: rgba(30, 41, 59, 0.04);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 14px;
  color: rgba(30, 41, 59, 0.4);
  transition: all 0.3s;
}
.kill-card:hover .kill-icon {
  background: rgba(255, 140, 66, 0.12);
  color: var(--orange);
}

.kill-text {
  flex: 1;
  min-width: 0;
}
.kill-strike {
  font-size: 14px;
  font-weight: 700;
  color: rgba(30, 41, 59, 0.7);
  letter-spacing: -0.005em;
  line-height: 1.35;
  position: relative;
  display: inline;
}
.kill-strike::after {
  content: '';
  position: absolute;
  left: -2px; right: -2px;
  top: 50%;
  height: 2px;
  background: rgba(255, 140, 66, 0.6);
  transform: scaleX(0);
  transform-origin: left center;
  transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}
.reveal.in .kill-strike::after {
  transform: scaleX(1);
}

.kill-cta {
  text-align: center;
  margin-top: 40px;
}
.kill-arrow {
  color: var(--orange);
  font-size: 18px;
  margin-bottom: 14px;
  animation: arrow-bob 2s ease-in-out infinite;
}
@keyframes arrow-bob {
  0%, 100% { transform: translateY(0); opacity: 0.6; }
  50%      { transform: translateY(6px); opacity: 1; }
}
.kill-resolution {
  font-size: clamp(20px, 4vw, 28px);
  font-weight: 900;
  color: var(--navy);
  letter-spacing: -0.025em;
}

/* ============ LOGO DOT ============ */
.logo-dot {
  display: inline-block;
  width: 5px; height: 5px;
  background: var(--orange);
  border-radius: 50%;
  margin-left: 1px;
  position: relative;
  top: -6px;
  animation: dot-pulse 2.5s ease-in-out infinite;
  flex-shrink: 0;
}

/* ============ FRAUNCES ITALIC ============ */
.fraunces-italic {
  font-family: 'Fraunces', Georgia, serif;
  font-style: italic;
  font-weight: 400;
  letter-spacing: -0.025em;
}

/* ============ SCROLL REVEAL ============ */
.reveal {
  opacity: 0;
  transform: translateY(40px);
  transition:
    opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}
.reveal.in {
  opacity: 1;
  transform: translateY(0);
}

/* ============ STEP CARDS ============ */
.step-card {
  position: relative;
  overflow: hidden;
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s ease;
}
.step-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 28px 52px -16px rgba(30, 41, 59, 0.14), 0 8px 16px -8px rgba(255, 140, 66, 0.1);
}
.step-number-deco {
  position: absolute;
  top: 18px; right: 22px;
  font-family: 'Fraunces', Georgia, serif;
  font-style: italic;
  font-size: 46px;
  font-weight: 400;
  line-height: 1;
  color: rgba(255, 140, 66, 0.15);
  letter-spacing: -0.04em;
  pointer-events: none;
  user-select: none;
}

/* ============ VIBE PREVIEW GRID ============ */
.vibe-preview-card {
  background: rgba(255, 255, 255, 0.5);
  border: 1.5px solid rgba(255, 255, 255, 0.8);
  border-radius: 18px;
  padding: 16px;
  backdrop-filter: blur(10px);
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  cursor: default;
}
.vibe-preview-card:hover {
  transform: translateY(-3px);
  background: rgba(255, 255, 255, 0.75);
  border-color: rgba(255, 140, 66, 0.25);
}

/* ============ BOTTOM CTA GLOW ============ */
.cta-glow {
  position: absolute;
  top: -50%; left: -10%;
  width: 120%; height: 120%;
  background: radial-gradient(circle, rgba(255, 140, 66, 0.12) 0%, transparent 60%);
  pointer-events: none;
}

/* ============ BUTTON MICRO ============ */
.btn-arrow {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
}
.btn-arrow:hover {
  transform: translateY(-2px) !important;
}
.btn-arrow-icon {
  display: inline-block;
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.btn-arrow:hover .btn-arrow-icon {
  transform: translateX(4px);
}

/* Nav */
.nav-link-active {
  color: var(--navy);
  background: none; border: none; cursor: pointer;
  transition: color 0.2s; padding: 0;
  font-family: 'IBM Plex Sans Thai', 'Inter', sans-serif;
}
.nav-link-active:hover { color: var(--orange); }
.nav-link-soon {
  color: rgba(30,41,59,0.3);
  cursor: default;
  display: flex; align-items: center; gap: 6px;
}
.soon-badge {
  font-size: 9px; font-weight: 800;
  text-transform: uppercase; letter-spacing: 0.08em;
  padding: 2px 7px; border-radius: 99px;
  background: rgba(30,41,59,0.06); color: rgba(30,41,59,0.35);
}

/* Footer */
.footer-link {
  font-size: 13px; font-weight: 700;
  color: rgba(30,41,59,0.5);
  text-decoration: none;
  transition: color 0.2s;
}
.footer-link:hover { color: var(--orange); }
.version-badge {
  font-size: 10px; font-weight: 800;
  text-transform: uppercase; letter-spacing: 0.1em;
  padding: 3px 9px; border-radius: 99px;
  background: rgba(255,140,66,0.1); color: var(--orange);
  border: 1px solid rgba(255,140,66,0.2);
}
</style>
