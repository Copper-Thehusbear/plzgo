<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTripStore } from '@/stores/useTripStore'
import { trackVibeSelected, trackCTA } from '@/composables/useAnalytics'
import { useWeather } from '@/composables/useWeather'
import AppLayout from '@/components/AppLayout.vue'

const router = useRouter()
const store  = useTripStore()

const vibes = [
  { id: 'chill',    label: 'Chill',    sub: 'Pools & slow mornings', icon: 'fa-umbrella-beach' },
  { id: 'foodie',   label: 'Foodie',   sub: 'Street food & gems',    icon: 'fa-bowl-rice' },
  { id: 'party',    label: 'Party',    sub: 'Bars & late nights',    icon: 'fa-music' },
  { id: 'photo',    label: 'Photo',    sub: 'Temples & light',       icon: 'fa-camera' },
  { id: 'gay-vibe', label: 'Gay Vibe', sub: 'Silom · Soi 4',         icon: 'fa-rainbow' },
  { id: 'wellness', label: 'Wellness', sub: 'Spas & rituals',        icon: 'fa-spa' },
  { id: 'local',    label: 'Local',    sub: 'Authentic & hidden',    icon: 'fa-map-pin' },
  { id: 'shopping', label: 'Shopping', sub: 'Markets & malls',       icon: 'fa-bag-shopping' },
]

const selectedVibes = ref([])   // up to 3
const gayFilterOn   = ref(false)
const localModeOn   = ref(false)
const arrivalDate   = ref('')
const departureDate = ref('')
const flightNumber  = ref('')

function toggleVibe(id) {
  const idx = selectedVibes.value.indexOf(id)
  if (idx >= 0) {
    selectedVibes.value.splice(idx, 1)
  } else {
    if (selectedVibes.value.length >= 3) selectedVibes.value.shift()
    selectedVibes.value.push(id)
  }
}

const canStart = computed(() => selectedVibes.value.length > 0)

const tripNights = computed(() => {
  if (!arrivalDate.value || !departureDate.value) return 0
  const n = Math.round((new Date(departureDate.value) - new Date(arrivalDate.value)) / 86400000)
  return n > 0 ? n : 0
})

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const tripSummary = computed(() => {
  const n = tripNights.value
  if (!n) return null
  const d1 = new Date(arrivalDate.value)
  const d2 = new Date(departureDate.value)
  return `${MONTHS[d1.getMonth()]} ${d1.getDate()} → ${MONTHS[d2.getMonth()]} ${d2.getDate()} · ${n} night${n > 1 ? 's' : ''}`
})

const SEASONAL_NOTES = {
  0:  'Hot & dry — perfect pool weather',
  1:  'Hot & dry — perfect pool weather',
  2:  'Songkran month — wildest water festival',
  3:  'Songkran water festival — wildest time of year',
  4:  'Start of wet season — fewer crowds',
  5:  'Rainy season — indoor gems shine',
  6:  'Rainy season — lush & moody',
  7:  'Rainy season — great hotel deals',
  8:  'Rainy season winding down',
  9: 'Best weather of the year begins',
  10: 'Loy Krathong — lanterns on the river',
  11: 'Festive season — rooftop parties everywhere',
}

const seasonalNote = computed(() => {
  if (!arrivalDate.value) return null
  return SEASONAL_NOTES[new Date(arrivalDate.value).getMonth()] ?? null
})

const weather = ref(null)
const { fetchWeather } = useWeather()

onMounted(async () => {
  weather.value = await fetchWeather()
})

function start() {
  if (!canStart.value) return
  trackCTA('start', 'Start swiping')
  store.reset()
  store.setCity('Bangkok')
  store.setVibes([...selectedVibes.value])
  store.gayFilterOn = gayFilterOn.value
  store.localModeOn = localModeOn.value
  const nights = tripNights.value || 1
  store.setDays(nights)
  store.tripMode = nights > 1 ? 'full' : 'chill'
  router.push('/swipe')
}
</script>

<template>
  <AppLayout>
    <template #header>
      <!-- Navigation -->
      <nav class="glass-nav h-16 w-full">
        <div class="max-w-7xl mx-auto h-full px-4 md:px-6 lg:px-8 flex items-center justify-between">
          <div class="flex items-center gap-8">
            <span class="hv-wordmark display-cond cursor-pointer" @click="router.push('/')">plz<span style="color:var(--line-1)">go</span></span>
            <div class="hidden md:flex items-center gap-6">
              <button class="text-sm font-bold" style="color:var(--ink)" @click="router.push('/plan')">Plan</button>
              <button class="text-sm font-semibold hv-nav-muted" @click="router.push('/explore')">Explore</button>
            </div>
          </div>
          <div class="hv-city-pill data-mono">
            <span class="hv-city-dot"></span>
            Bangkok
          </div>
        </div>
      </nav>
    </template>

    <!-- Main Content -->
    <main class="flex-1 px-4 md:px-6 lg:px-8 max-w-7xl mx-auto w-full pt-20 pb-32">

      <!-- Header -->
      <div class="mb-10 lg:mb-14">
        <p class="hv-eyebrow data-mono">Bangkok, Thailand</p>
        <h1 class="display-cond text-4xl lg:text-6xl leading-[0.95]" style="color:var(--ink)">
          Plan your trip<br>
          <span style="color:var(--muted)">Pick your line</span>
        </h1>
      </div>

      <!-- Grid Layout -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        <!-- Left: Form -->
        <div class="lg:col-span-8 flex flex-col gap-8">
          
          <!-- Vibe grid — pick your line -->
          <section>
            <div class="flex items-center justify-between mb-4">
              <p class="section-label" style="margin-bottom:0">Select your mood</p>
              <span class="data-mono text-[10px]" style="color:var(--muted)">{{ selectedVibes.length }}/3 selected</span>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <button
                v-for="vibe in vibes"
                :key="vibe.id"
                class="vibe-btn"
                :class="{ 'active': selectedVibes.includes(vibe.id) }"
                @click="toggleVibe(vibe.id); trackVibeSelected(vibe.id)"
              >
                <i :class="`fa-solid ${vibe.icon} text-xl mb-3`" :style="{ color: selectedVibes.includes(vibe.id) ? '#fff' : 'var(--ink)' }"></i>
                <span class="vibe-btn-label font-bold text-[13px] block">{{ vibe.label }}</span>
                <span class="vibe-btn-sub text-[9px] block mt-1 leading-tight">{{ vibe.sub }}</span>
              </button>
            </div>
          </section>

          <!-- Filters row -->
          <div class="flex gap-3">
            <button
              class="filter-toggle"
              :class="{ 'active': gayFilterOn }"
              @click="gayFilterOn = !gayFilterOn"
            >
              <span class="filter-toggle-dot" :class="{ 'active': gayFilterOn }"></span>
              Gay-friendly
            </button>
            <button
              class="filter-toggle"
              :class="{ 'active': localModeOn }"
              @click="localModeOn = !localModeOn"
            >
              <span class="filter-toggle-dot" :class="{ 'active': localModeOn }"></span>
              Local picks
              <span class="text-[9px] opacity-60 ml-1">· skip tourist trail</span>
            </button>
          </div>

          <!-- Dates & Flight -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <section class="glass-panel p-6">
              <p class="section-label">When are you here?</p>
              <div class="flex flex-col gap-4">
                <div class="date-input-group">
                  <label>Arrival</label>
                  <input type="date" v-model="arrivalDate" />
                </div>
                <div class="date-input-group">
                  <label>Departure</label>
                  <input type="date" v-model="departureDate" />
                </div>
              </div>
              <Transition name="fade">
                <div v-if="tripSummary" class="hv-trip-strip mt-4">
                  <p class="data-mono text-[11px]" style="color:var(--orange-text);margin:0">{{ tripSummary }}</p>
                  <span v-if="seasonalNote" class="text-[11px] font-semibold" style="color:var(--muted)">{{ seasonalNote }}</span>
                </div>
              </Transition>
            </section>

            <section class="glass-panel p-6 flex flex-col">
              <p class="section-label">Flight Info (Optional)</p>
              <div class="flex-1 flex flex-col">
                <div class="flight-input">
                  <i class="fa-solid fa-plane" style="color:var(--muted)"></i>
                  <input type="text" v-model="flightNumber" placeholder="e.g. TG480" class="data-mono" />
                </div>
                <div class="mt-auto pt-6">
                  <p class="text-[11px] leading-relaxed" style="color:var(--muted)">
                    We'll time your itinerary around your arrival.
                  </p>
                </div>
              </div>
            </section>
          </div>

          <!-- Weather Bento -->
          <Transition name="fade">
            <div v-if="weather && weather.precipProb !== null" class="glass-panel p-5">
              <div class="flex justify-between items-start">
                <div>
                  <p class="section-label" style="margin-bottom:6px">Bangkok now</p>
                  <h3 class="data-mono text-4xl leading-none" style="color:var(--ink)">
                    {{ weather.temp != null ? weather.temp + '°C' : weather.weatherLabel }}
                  </h3>
                  <p v-if="weather.temp != null" class="text-[13px] font-semibold mt-2" style="color:var(--muted)">
                    {{ weather.weatherLabel }}
                    <span v-if="weather.isComing" class="ml-1" style="color:var(--orange-text)">· Rain approaching</span>
                  </p>
                </div>
                <div class="flex flex-col items-end gap-2">
                  <i :class="`fa-solid ${weather.weatherIcon} text-3xl`" style="color:var(--muted)"></i>
                  <span class="data-mono text-[11px]" style="color:var(--muted)">{{ weather.precipProb }}% rain</span>
                </div>
              </div>
              <p v-if="weather.tip" class="text-[12px] font-semibold mt-4 pt-4" style="color:var(--muted); border-top:1px solid var(--hairline)">
                {{ weather.tip }}
              </p>
            </div>
          </Transition>

          <!-- CTA — the ONE orange element on this screen -->
          <button
            class="btn-ios hv-cta"
            :class="{ 'hv-cta-disabled': !canStart }"
            @click="start"
          >
            {{ canStart ? 'Build my route' : 'Pick a vibe first' }}
            <i class="fa-solid fa-arrow-right ml-2" v-if="canStart"></i>
          </button>
        </div>

        <!-- Right: Promo & How it works -->
        <div class="lg:col-span-4 flex flex-col gap-8">

          <!-- Promo block — flat ink plate, no stock photos -->
          <div class="hv-promo">
            <span class="data-mono hv-promo-eyebrow">Curated by locals</span>
            <h3 class="display-cond text-3xl text-white leading-none" style="margin:0">Your sassy<br>Bangkok guide</h3>
          </div>

          <!-- How it works — three stops on a line -->
          <div class="glass-panel p-8">
            <p class="section-label">How it works</p>
            <div class="hv-steps">
              <div v-for="(step, i) in [
                { title:'Swipe to pick', desc:'Tinder-style cards for spots' },
                { title:'Get your route', desc:'Optimised by zone & time' },
                { title:'Share the link', desc:'One link, saved forever' },
              ]" :key="step.title" class="hv-step">
                <div class="hv-step-track">
                  <span class="hv-step-line hv-step-line-top" :class="{ invisible: i === 0 }"></span>
                  <span class="hv-step-dot data-mono">{{ i + 1 }}</span>
                  <span class="hv-step-line" :class="{ invisible: i === 2 }"></span>
                </div>
                <div class="hv-step-body">
                  <h4 class="text-[13px] font-bold leading-tight" style="color:var(--ink)">{{ step.title }}</h4>
                  <p class="text-[11px]" style="color:var(--muted)">{{ step.desc }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </main>

  </AppLayout>
</template>

<style scoped>
.hv-wordmark {
  font-size: 24px;
  color: var(--ink);
}
.hv-nav-muted { color: var(--muted); transition: color 0.15s; }
.hv-nav-muted:hover { color: var(--ink); }

.hv-city-pill {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 5px 12px;
  background: #fff;
  border: 1px solid var(--hairline);
  border-radius: 999px;
  font-size: 10.5px;
  text-transform: uppercase;
  color: var(--ink);
}
.hv-city-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: var(--line-1);
  flex-shrink: 0;
}

.hv-eyebrow {
  font-size: 11px;
  text-transform: uppercase;
  color: var(--orange-text);
  margin-bottom: 8px;
}

.section-label {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 16px;
}

/* Vibe cells — flat white, hairline; selected = solid ink block */
.vibe-btn {
  background: #fff;
  border: 1px solid var(--hairline);
  border-radius: 8px;
  padding: 20px;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.vibe-btn:hover { border-color: var(--ink); }
.vibe-btn.active {
  background: var(--ink);
  border-color: var(--ink);
}
.vibe-btn .vibe-btn-label { color: var(--ink); }
.vibe-btn .vibe-btn-sub   { color: var(--muted); }
.vibe-btn.active .vibe-btn-label { color: #fff; }
.vibe-btn.active .vibe-btn-sub   { color: rgba(255,255,255,0.7); }

.date-input-group label {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 9px;
  font-weight: 500;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 4px;
  display: block;
}
.date-input-group input {
  width: 100%;
  background: #fff;
  border: 1px solid var(--hairline);
  border-radius: 8px;
  padding: 10px 16px;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 13px;
  font-weight: 500;
  color: var(--ink);
  outline: none;
  transition: border-color 0.15s;
}
.date-input-group input:focus { border-color: var(--ink); }

.hv-trip-strip {
  padding: 10px 14px;
  background: #fff;
  border: 1px solid var(--hairline);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.flight-input {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fff;
  border: 1px solid var(--hairline);
  border-radius: 8px;
  padding: 12px 16px;
  transition: border-color 0.15s;
}
.flight-input:focus-within { border-color: var(--ink); }
.flight-input input {
  background: transparent;
  outline: none;
  border: none;
  width: 100%;
  font-size: 13px;
  color: var(--ink);
}

.hv-cta {
  height: 60px;
  border-radius: 8px;
  font-size: 17px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.hv-cta-disabled {
  background: var(--hairline);
  color: var(--muted);
  pointer-events: none;
}

/* Promo — flat ink plate */
.hv-promo {
  background: var(--ink);
  border-radius: 8px;
  padding: 32px 28px;
}
.hv-promo-eyebrow {
  display: block;
  font-size: 10px;
  text-transform: uppercase;
  color: var(--signal);
  margin-bottom: 10px;
}

/* How it works — numbered stops on a line */
.hv-steps { display: flex; flex-direction: column; }
.hv-step {
  display: grid;
  grid-template-columns: 24px 1fr;
  column-gap: 14px;
}
.hv-step-track {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.hv-step-line {
  width: 3px;
  flex: 1;
  background: var(--line-1);
  min-height: 10px;
}
.hv-step-line-top { flex: none; height: 0; }
.hv-step-dot {
  width: 24px; height: 24px;
  border-radius: 50%;
  background: #fff;
  border: 3px solid var(--line-1);
  color: var(--ink);
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.hv-step-body { padding-bottom: 22px; }
.hv-step:last-child .hv-step-body { padding-bottom: 0; }
.invisible { visibility: hidden; }

.fade-enter-active, .fade-leave-active { transition: all 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(-10px); }

.filter-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  background: #fff;
  border: 1px solid var(--hairline);
  color: var(--muted);
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
  font-family: 'IBM Plex Sans Thai', sans-serif;
}
.filter-toggle:hover { border-color: var(--ink); color: var(--ink); }
.filter-toggle.active {
  background: #fff;
  border-color: var(--ink);
  color: var(--ink);
}

.filter-toggle-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: var(--hairline);
  flex-shrink: 0;
  transition: background 0.2s;
}
.filter-toggle-dot.active {
  background: var(--line-2);
}
</style>