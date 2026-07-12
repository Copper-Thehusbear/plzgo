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
            <span class="text-2xl font-black tracking-tighter text-slate-900 cursor-pointer" @click="router.push('/')">plz<span class="text-orange-500">go</span></span>
            <div class="hidden md:flex items-center gap-6">
              <button class="text-sm font-black text-slate-900" @click="router.push('/plan')">Plan</button>
              <button class="text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors" @click="router.push('/explore')">Explore</button>
            </div>
          </div>
          <div class="flex items-center gap-2 px-3 py-1.5 bg-white/60 border border-white rounded-full shadow-sm">
            <span class="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
            <span class="text-[11px] font-black uppercase tracking-widest text-slate-800">Bangkok</span>
          </div>
        </div>
      </nav>
    </template>

    <!-- Main Content -->
    <main class="flex-1 px-4 md:px-6 lg:px-8 max-w-7xl mx-auto w-full pt-20 pb-32">

      <!-- Header -->
      <div class="mb-10 lg:mb-14">
        <p class="text-orange-500 text-[11px] font-black uppercase tracking-[0.2em] mb-2">Bangkok, Thailand</p>
        <h1 class="text-4xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[0.95]">
          Plan your trip<br>
          <span class="text-slate-400">Pick your vibe</span>
        </h1>
      </div>

      <!-- Grid Layout -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        <!-- Left: Form -->
        <div class="lg:col-span-8 flex flex-col gap-8">
          
          <!-- Vibe Bento -->
          <section>
            <div class="flex items-center justify-between mb-4">
              <p class="section-label" style="margin-bottom:0">Select your mood</p>
              <span class="text-[10px] font-bold text-slate-400">{{ selectedVibes.length }}/3 selected</span>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <button
                v-for="vibe in vibes"
                :key="vibe.id"
                class="vibe-btn"
                :class="{ 'active': selectedVibes.includes(vibe.id) }"
                @click="toggleVibe(vibe.id); trackVibeSelected(vibe.id)"
              >
                <i :class="`fa-solid ${vibe.icon} text-xl mb-3`" :style="{ color: selectedVibes.includes(vibe.id) ? '#fff' : 'var(--orange)' }"></i>
                <span class="font-black text-[13px] block">{{ vibe.label }}</span>
                <span class="text-[9px] font-bold opacity-60 block mt-1 leading-tight">{{ vibe.sub }}</span>
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
                <div v-if="tripSummary" class="mt-4 p-3 bg-orange-50 rounded-xl border border-orange-100 flex items-center justify-between">
                  <p class="text-[11px] font-bold text-orange-600">{{ tripSummary }}</p>
                  <span v-if="seasonalNote" class="text-[11px] font-bold text-orange-700 italic">{{ seasonalNote }}</span>
                </div>
              </Transition>
            </section>

            <section class="glass-panel p-6 flex flex-col">
              <p class="section-label">Flight Info (Optional)</p>
              <div class="flex-1 flex flex-col">
                <div class="flight-input">
                  <i class="fa-solid fa-plane text-slate-300"></i>
                  <input type="text" v-model="flightNumber" placeholder="e.g. TG480" />
                </div>
                <div class="mt-auto pt-6">
                  <p class="text-[10px] leading-relaxed text-slate-400 font-bold italic uppercase">
                    "We'll time your itinerary based on your arrival."
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
                  <p class="section-label" style="margin-bottom:6px">Bangkok Now</p>
                  <h3 class="text-4xl font-black leading-none" style="color:var(--navy)">
                    {{ weather.temp != null ? weather.temp + '°C' : weather.weatherLabel }}
                  </h3>
                  <p v-if="weather.temp != null" class="text-[13px] font-bold mt-2" style="color:rgba(28,39,61,0.5)">
                    {{ weather.weatherLabel }}
                    <span v-if="weather.isComing" class="ml-1" style="color:#B45309">· Rain approaching</span>
                  </p>
                </div>
                <div class="flex flex-col items-end gap-2">
                  <i :class="`fa-solid ${weather.weatherIcon} text-3xl`" style="color:var(--orange)"></i>
                  <span class="text-[11px] font-bold" style="color:rgba(28,39,61,0.35)">{{ weather.precipProb }}% rain</span>
                </div>
              </div>
              <p v-if="weather.tip" class="text-[12px] font-semibold mt-4 pt-4" style="color:rgba(28,39,61,0.45); border-top:1px solid rgba(28,39,61,0.07)">
                {{ weather.tip }}
              </p>
            </div>
          </Transition>

          <!-- CTA -->
          <button
            class="btn-ios h-16 rounded-2xl text-lg shadow-xl shadow-orange-500/20"
            :class="{ 'opacity-50 grayscale pointer-events-none': !canStart }"
            @click="start"
          >
            {{ canStart ? 'Start Swiping' : 'Pick a vibe first' }}
            <i class="fa-solid fa-arrow-right ml-2" v-if="canStart"></i>
          </button>
        </div>

        <!-- Right: Promo & How it works -->
        <div class="lg:col-span-4 flex flex-col gap-8">
          
          <!-- Hero Card -->
          <div class="relative h-64 lg:h-80 rounded-[32px] overflow-hidden shadow-2xl group">
            <img 
              src="https://images.unsplash.com/photo-1563492065599-3520f775eeed?auto=format&fit=crop&q=80&w=800" 
              class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <div class="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent"></div>
            <div class="absolute bottom-6 left-6 right-6">
              <span class="text-orange-400 text-[10px] font-black uppercase tracking-widest mb-2 block">Curated by locals</span>
              <h3 class="text-2xl font-black text-white leading-none">Your sassy<br>Bangkok guide</h3>
            </div>
          </div>

          <!-- How it works -->
          <div class="glass-panel p-8">
            <p class="section-label">How it works</p>
            <div class="flex flex-col gap-6">
              <div v-for="step in [
                { icon:'fa-hand-pointer', title:'Swipe to pick', desc:'Tinder-style cards for spots' },
                { icon:'fa-map-location-dot', title:'Get Route', desc:'Optimised by zone & time' },
                { icon:'fa-share-nodes', title:'Share Link', desc:'One link, saved forever' },
              ]" :key="step.title" class="flex gap-4">
                <div class="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <i :class="`fa-solid ${step.icon} text-orange-500 text-sm`"></i>
                </div>
                <div>
                  <h4 class="text-[13px] font-black text-slate-900 leading-tight">{{ step.title }}</h4>
                  <p class="text-[11px] text-slate-500 font-bold">{{ step.desc }}</p>
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
.section-label {
  @apply text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-4;
}

.vibe-btn {
  @apply bg-white/40 border-2 border-white/60 rounded-[22px] p-5 text-left transition-all duration-300;
  backdrop-filter: blur(10px);
}
.vibe-btn:hover {
  @apply -translate-y-1 bg-white/60 border-orange-200 shadow-lg shadow-orange-500/5;
}
.vibe-btn.active {
  @apply bg-orange-500 border-orange-500 shadow-xl shadow-orange-500/30;
}
.vibe-btn.active span {
  @apply text-white;
}

.date-input-group label {
  @apply text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 block;
}
.date-input-group input {
  @apply w-full bg-white/60 border border-white rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 outline-none transition-all;
}
.date-input-group input:focus {
  @apply border-orange-300 ring-2 ring-orange-500/10;
}

.flight-input {
  @apply flex items-center gap-3 bg-white/60 border border-white rounded-xl px-4 py-3 transition-all;
}
.flight-input:focus-within {
  @apply border-orange-300 ring-2 ring-orange-500/10;
}
.flight-input input {
  @apply bg-transparent outline-none w-full text-sm font-bold text-slate-800;
}

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
  background: rgba(255,255,255,0.5);
  border: 1.5px solid rgba(255,255,255,0.7);
  color: rgba(28,39,61,0.55);
  cursor: pointer;
  transition: all 0.25s;
  backdrop-filter: blur(8px);
}
.filter-toggle:hover {
  background: rgba(255,255,255,0.7);
  color: rgba(28,39,61,0.8);
}
.filter-toggle.active {
  background: rgba(28,39,61,0.08);
  border-color: rgba(28,39,61,0.2);
  color: var(--navy);
}

.filter-toggle-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: rgba(28,39,61,0.2);
  flex-shrink: 0;
  transition: background 0.2s;
}
.filter-toggle-dot.active {
  background: var(--orange);
}
</style>