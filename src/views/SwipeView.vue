<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTripStore } from '@/stores/useTripStore'
import { useFirestore } from '@/composables/useFirestore'
import { trackSwipe } from '@/composables/useAnalytics'
import SwipeCard from '@/components/SwipeCard.vue'
import AppLayout from '@/components/AppLayout.vue'

const router = useRouter()
const store = useTripStore()
const { fetchCardPool } = useFirestore()

const loading      = ref(true)
const fallback     = ref(false)
const cards        = ref([])
const currentIndex = ref(0)
const topCardRef   = ref(null)

const currentCard = computed(() => cards.value[currentIndex.value] ?? null)
const nextCard    = computed(() => cards.value[currentIndex.value + 1] ?? null)
const thirdCard   = computed(() => cards.value[currentIndex.value + 2] ?? null)

// Last few picks, shown as a station trail under the deck.
const trail = computed(() => {
  const picks = store.swipedPlaces
  const shown = picks.slice(-3).map(p => p.name_en || p.name)
  return { shown, overflow: Math.max(0, picks.length - 3) }
})

// Deck breathing: back card follows the top card's drag progress linearly —
// at progress 1 (exit) it sits at scale 1 / y 0, so the reveal never "pops".
const topProgress = ref(0)
const backCardStyle = computed(() => ({
  transform: `scale(${0.94 + 0.06 * topProgress.value}) translateY(${14 * (1 - topProgress.value)}px)`,
  opacity: 0.36 + 0.64 * topProgress.value,
}))
const isDeckEmpty = computed(() => !loading.value && currentIndex.value >= cards.value.length)
const yepCount    = computed(() => store.swipedPlaces.length)
const remaining   = computed(() => Math.max(0, cards.value.length - currentIndex.value - 1))

onMounted(async () => {
  try {
    const pool = await fetchCardPool(store.selectedCity, store.selectedVibes, store.modeConfig, store.openNow, store.gayFilterOn, store.localModeOn)
    cards.value = pool.length > 0 ? pool : bangkokFallback()
    store.setCardPool(cards.value)
    if (pool.length === 0) fallback.value = true
  } catch (e) {
    console.error('Firestore fetch failed:', e)
    fallback.value = true
    cards.value = bangkokFallback()
  } finally {
    loading.value = false
  }
})

function handleSwipe(direction) {
  if (!currentCard.value) return
  trackSwipe(direction, currentCard.value)
  if (direction === 'yep') {
    const added = store.swipeYep(currentCard.value)
    if (added && store.swipedPlaces.length >= store.modeConfig.yepCap) {
      router.push('/route')
      return
    }
  }
  currentIndex.value++
  topProgress.value = 0
}

function triggerButtonSwipe(dir) {
  // Trigger the card's exit animation via the exposed method
  const ref = topCardRef.value
  if (ref && ref.triggerExit) {
    ref.triggerExit(dir === 'yep' ? 1 : -1, dir)
  } else {
    handleSwipe(dir)
  }
}

function bangkokFallback() {
  return [
    { id:'f01', city:'Bangkok', zone:'รัตนโกสินทร์', name:'วัดอรุณราชวรารามฯ', name_en:'Wat Arun – Temple of Dawn', description:'ตอนพระอาทิตย์ขึ้นสวยจนแทบร้องไห้', description_tourist:'Most photogenic temple in Bangkok. Cross the river by ferry for 5 THB. Sunrise is magical.', location:{latitude:13.7437,longitude:100.4888}, time_tag:'Morning', vibe_tags:['photo','spiritual','chill'], is_universal:true, price_range:'฿', duration_minutes:60, opening_hours:'08:00–18:00', image_url:null, affiliate_link:null, type:'attraction' },
    { id:'f02', city:'Bangkok', zone:'รัตนโกสินทร์', name:'วัดพระแก้ว', name_en:'Wat Phra Kaew & Grand Palace', description:'ต้องมา ถ้าไม่มาคือยังไม่ได้มากรุงเทพ', description_tourist:'The most sacred temple in Thailand. Worth every baht of the 500 THB entrance fee. Go before 9AM.', location:{latitude:13.75,longitude:100.4913}, time_tag:'Morning', vibe_tags:['spiritual','photo','local'], is_universal:true, price_range:'฿฿', duration_minutes:120, opening_hours:'08:30–15:30', image_url:null, affiliate_link:null, type:'attraction' },
    { id:'f03', city:'Bangkok', zone:'รัตนโกสินทร์', name:'วัดโพธิ์', name_en:'Wat Pho – Reclining Buddha', description:'พระนอนยักษ์ขนาด 46 เมตร', description_tourist:'46-meter reclining Buddha. Get a Thai massage after — best 300 THB you’ll spend.', location:{latitude:13.7465,longitude:100.4927}, time_tag:'Morning', vibe_tags:['spiritual','photo','chill'], is_universal:true, price_range:'฿฿', duration_minutes:90, opening_hours:'08:00–18:30', image_url:null, affiliate_link:null, type:'attraction' },
    { id:'f04', city:'Bangkok', zone:'พระนคร', name:'เจ๊ไฝ', name_en:'Jay Fai', description:'สตรีทฟู้ดมิชลินสตาร์', description_tourist:'Michelin-starred street food. Crab omelette 500 THB. Queue 2–3 hrs. Worth every second.', location:{latitude:13.7534,longitude:100.5035}, time_tag:'Afternoon', vibe_tags:['foodie'], is_universal:true, price_range:'฿฿฿฿', duration_minutes:60, opening_hours:'14:00–22:00', image_url:null, affiliate_link:null, type:'food' },
    { id:'f05', city:'Bangkok', zone:'สีลม', name:'Sky Bar at Lebua', name_en:'Sky Bar – Lebua at State Tower', description:'บาร์บนดาดฟ้าที่ถ่าย Hangover 2', description_tourist:'The Hangover 2 rooftop bar. One drink minimum. The view justifies everything.', location:{latitude:13.7225,longitude:100.5145}, time_tag:'Evening', vibe_tags:['luxury','photo','party'], is_universal:true, price_range:'฿฿฿฿', duration_minutes:90, opening_hours:'18:00–01:00', image_url:null, affiliate_link:null, type:'nightlife' },
    { id:'f06', city:'Bangkok', zone:'สีลม', name:'Silom Soi 4', name_en:'Silom Soi 4 – LGBTQ+ Strip', description:'หัวใจ gay scene กรุงเทพ', description_tourist:'Heart of Bangkok’s gay nightlife. Outdoor bars, drag shows, friendly crowd.', location:{latitude:13.7279,longitude:100.5284}, time_tag:'Night', vibe_tags:['gay-vibe','party','chill'], is_universal:true, price_range:'฿฿', duration_minutes:180, opening_hours:'20:00–02:00', image_url:null, affiliate_link:null, type:'nightlife' },
    { id:'f07', city:'Bangkok', zone:'รัตนโกสินทร์', name:'ถนนข้าวสาร', name_en:'Khao San Road', description:'ถนนแบ็คแพ็คเกอร์', description_tourist:'The world’s most famous backpacker street. Cheap beer, loud music, chaos.', location:{latitude:13.7593,longitude:100.4971}, time_tag:'Night', vibe_tags:['party','budget','local'], is_universal:true, price_range:'฿', duration_minutes:180, opening_hours:'10:00–02:00', image_url:null, affiliate_link:null, type:'area' },
    { id:'f08', city:'Bangkok', zone:'สุขุมวิท', name:'Jodd Fairs', name_en:'Jodd Fairs Night Market', description:'ไนท์มาร์เก็ตที่ฮอตที่สุด', description_tourist:'Bangkok’s hottest night market. The lava cheese pork ribs are Instagram-famous.', location:{latitude:13.7562,longitude:100.5649}, time_tag:'Evening', vibe_tags:['foodie','photo','local'], is_universal:true, price_range:'฿฿', duration_minutes:120, opening_hours:'17:00–00:00', image_url:null, affiliate_link:null, type:'market' },
    { id:'f09', city:'Bangkok', zone:'จตุจักร', name:'ตลาดนัดจตุจักร', name_en:'Chatuchak Weekend Market', description:'ตลาดใหญ่ที่สุดในโลก', description_tourist:'World’s largest weekend market. 15,000 stalls. Budget 4+ hours.', location:{latitude:13.7999,longitude:100.55}, time_tag:'Morning', vibe_tags:['local','foodie','chill'], is_universal:true, price_range:'฿', duration_minutes:240, opening_hours:'09:00–18:00', image_url:null, affiliate_link:null, type:'market' },
    { id:'f10', city:'Bangkok', zone:'สุขุมวิท', name:'Asiatique', name_en:'Asiatique The Riverfront', description:'ไนท์มาร์เก็ตริมแม่น้ำ', description_tourist:'Riverside night market in restored warehouses. Free shuttle boat from Saphan Taksin.', location:{latitude:13.7196,longitude:100.4985}, time_tag:'Evening', vibe_tags:['chill','photo','foodie'], is_universal:true, price_range:'฿฿', duration_minutes:150, opening_hours:'17:00–00:00', image_url:null, affiliate_link:null, type:'market' },
    { id:'f11', city:'Bangkok', zone:'สุขุมวิท', name:'สวนลุมพินี', name_en:'Lumpini Park', description:'ปอดของกรุงเทพ', description_tourist:'Bangkok’s green oasis. Giant monitor lizards patrol the lake.', location:{latitude:13.7306,longitude:100.5418}, time_tag:'Morning', vibe_tags:['chill','local'], is_universal:true, price_range:'฿', duration_minutes:60, opening_hours:'04:30–21:00', image_url:null, affiliate_link:null, type:'attraction' },
    { id:'f12', city:'Bangkok', zone:'เยาวราช', name:'เยาวราช', name_en:'Yaowarat – Chinatown at Night', description:'เยาวราชตอนกลางคืน', description_tourist:'Bangkok’s Chinatown comes alive at night. Neon signs, street seafood, best egg tarts.', location:{latitude:13.7399,longitude:100.51}, time_tag:'Night', vibe_tags:['foodie','local','photo'], is_universal:true, price_range:'฿฿', duration_minutes:120, opening_hours:'18:00–00:00', image_url:null, affiliate_link:null, type:'area' },
  ]
}
</script>

<template>
  <!-- sw-navy falls through to AppLayout's root — SwipeView is the only navy screen -->
  <AppLayout class="sw-navy">
    <template #header>
      <!-- Nav: back · progress · route-pill -->
      <nav class="glass-nav h-16 w-full">
        <div class="max-w-7xl mx-auto h-full px-3 sm:px-4 flex items-center justify-between gap-3">
          <!-- Left: back -->
          <button class="sw-icon-btn" @click="$router.push('/plan')" aria-label="Back">
            <i class="fa-solid fa-arrow-left"></i>
          </button>

          <!-- Center: progress -->
          <div class="sw-prog">
            <div class="sw-segs">
              <div
                v-for="i in store.modeConfig.yepCap"
                :key="i"
                class="sw-seg"
                :class="{ 'sw-seg--on': i <= yepCount }"
              />
            </div>
            <span class="sw-count data-mono">
              <span class="sw-count-curr">{{ yepCount }}</span><span class="sw-count-sep">/</span>{{ store.modeConfig.yepCap }}
            </span>
          </div>

          <!-- Right: route pill (only when have picks) -->
          <button
            v-if="yepCount > 0"
            class="sw-route-btn"
            @click="$router.push('/route')"
          >
            <i class="fa-solid fa-route"></i>
            <span class="sw-route-label">Route</span>
          </button>
          <div v-else class="sw-icon-btn-placeholder"></div>
        </div>
      </nav>
    </template>

    <!-- Main — tunnel surface: dot grid + one warm glow, like looking down a line -->
    <div class="sw-main plz-dotgrid plz-glow">

      <!-- Loading -->
      <div v-if="loading" class="sw-state">
        <div class="sw-spinner"></div>
        <p class="sw-state-txt">Finding spots…</p>
      </div>

      <!-- Empty deck -->
      <div v-else-if="isDeckEmpty" class="sw-state">
        <div class="sw-empty plz-paper plz-paper-tilt-l">
          <span class="plz-stamp plz-stamp-ink sw-empty-stamp">End of line</span>
          <p class="plz-eyebrow plz-eyebrow-ink">Terminus</p>
          <p class="sw-empty-title display-cond">Last stop.</p>
          <p class="sw-empty-sub">You've swiped through everything — try another line.</p>
          <div class="plz-perf"></div>
          <button class="btn-ios sw-empty-btn" @click="$router.push('/plan')">Start over</button>
        </div>
      </div>

      <!-- Swipe area -->
      <div v-else class="sw-area">

        <!-- Card stack — three deep, so the deck reads as a physical pile -->
        <div class="sw-stage">
          <div v-if="thirdCard" class="sw-card-third">
            <SwipeCard :place="thirdCard" />
          </div>
          <div v-if="nextCard" class="sw-card-back" :style="backCardStyle">
            <SwipeCard :place="nextCard" />
          </div>
          <div v-if="currentCard" :key="currentCard.id" class="sw-card-top">
            <SwipeCard
              ref="topCardRef"
              :place="currentCard"
              :isTop="true"
              :yepCount="yepCount"
              :remaining="remaining"
              @yep="handleSwipe('yep')"
              @nope="handleSwipe('nope')"
              @drag-progress="topProgress = $event"
            />
          </div>
        </div>

        <!-- Actions: Skip stop (left) / Board (right) -->
        <div class="sw-actions">
          <button
            class="sw-action sw-action-pass"
            @click="triggerButtonSwipe('nope')"
            aria-label="Skip stop"
          >
            <i class="fa-solid fa-xmark"></i>
          </button>

          <button
            class="sw-action sw-action-add"
            @click="triggerButtonSwipe('yep')"
            aria-label="Board"
          >
            <i class="fa-solid fa-plus"></i>
          </button>
        </div>

        <!-- Trail of picks so far — the route assembling itself, live -->
        <div class="plz-trail sw-trail">
          <template v-if="trail.shown.length">
            <template v-for="(name, i) in trail.shown" :key="name + i">
              <span v-if="i > 0" class="plz-trail-arrow">→</span>
              <span class="plz-trail-pin">{{ name }}</span>
            </template>
            <span v-if="trail.overflow" class="plz-trail-pin sw-trail-more">+{{ trail.overflow }}</span>
          </template>
          <p v-else class="sw-hint data-mono">Swipe · drag to scroll · tap photo</p>
        </div>

      </div>
    </div>
  </AppLayout>
</template>

<style scoped>
/* ─── Tunnel mode: the swipe screen keeps a dark ink background ─── */
.sw-navy {
  background: var(--ink);
}

/* Nav — solid ink strip, hairline below. No blur, no transparency tricks. */
.glass-nav {
  background: var(--ink);
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}
.sw-icon-btn {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: #fff;
  cursor: pointer;
  transition: border-color 0.15s, transform 0.08s ease-out;
  flex-shrink: 0;
}
.sw-icon-btn:hover  { border-color: rgba(255, 255, 255, 0.6); }
.sw-icon-btn:active { transform: translateY(1px); }
.sw-icon-btn-placeholder {
  width: 38px;
  height: 38px;
  flex-shrink: 0;
}

.sw-prog {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.sw-segs {
  display: flex;
  gap: 4px;
}
.sw-seg {
  width: 14px;
  height: 4px;
  border-radius: 99px;
  background: rgba(255, 255, 255, 0.18);
  transition: background 0.3s, transform 0.3s;
}
.sw-seg--on {
  background: var(--line-1);
  transform: scaleY(1.4);
}
.sw-count {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.55);
  white-space: nowrap;
}
.sw-count-curr { color: var(--line-1); }
.sw-count-sep  { color: rgba(255, 255, 255, 0.3); margin: 0 1px; }

.sw-route-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 16px;
  border-radius: 999px;
  border: none;
  background: #fff;
  color: var(--ink);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.08s ease-out;
  flex-shrink: 0;
  font-family: 'IBM Plex Sans Thai', sans-serif;
}
.sw-route-btn:active { transform: translateY(1px); }
.sw-route-btn i { font-size: 11px; }
@media (max-width: 380px) {
  .sw-route-label { display: none; }
  .sw-route-btn { padding: 0 12px; }
}

/* ─── Main layout ─── */
.sw-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding-top: calc(64px + env(safe-area-inset-top, 0px));
  min-height: 0;
  position: relative;   /* anchors the .plz-dotgrid / .plz-glow layers */
  overflow: hidden;
}
/* Everything real sits above the texture layers */
.sw-main > * { position: relative; z-index: 1; }

/* ─── States ─── */
.sw-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 56px 32px 32px;
}
.sw-spinner {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 3px solid rgba(255, 255, 255, 0.15);
  border-top-color: var(--line-1);
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.sw-state-txt {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
}
.sw-empty {
  border-radius: 8px;
  padding: 32px 30px 30px;
  text-align: left;
  max-width: 360px;
  width: 100%;
  box-shadow: var(--shadow-deep);
}
.sw-empty-stamp { top: -14px; right: -12px; }
.sw-empty-title {
  font-size: 28px;
  color: var(--ink);
  line-height: 1.05;
  margin-bottom: 8px;
}
.sw-empty-sub {
  font-size: 14px;
  color: var(--muted);
  line-height: 1.5;
  margin-bottom: 16px;
}
.sw-empty-btn {
  height: 48px;
  padding: 0 24px;
  border-radius: 8px;
  font-size: 15px;
  margin-top: 8px;
}

/* ─── Swipe area ─── */
.sw-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 16px 20px;
  min-height: 0;
}

.sw-stage {
  position: relative;
  width: 100%;
  max-width: 420px;
  margin: 0 auto;
  flex: 1 1 0;
  min-height: 0;
  max-height: 660px;
  margin-bottom: 18px;
}
/* Idle sway — wraps SwipeCard, never touches its own inline drag/exit
   transform (different element). Subtle enough not to fight the gesture. */
.sw-card-top {
  position: absolute;
  inset: 0;
  transform-origin: top center;
  animation: swAmbientSway 7s ease-in-out infinite;
}
@keyframes swAmbientSway {
  0%, 100% { transform: rotate(-0.7deg); }
  50%      { transform: rotate(0.7deg); }
}
.sw-card-back {
  position: absolute;
  inset: 0;
  transform: scale(0.94) translateY(14px);
  opacity: 0.36;
  transform-origin: bottom center;
  pointer-events: none;
}
/* Third card: just enough edge showing to read as a real pile */
.sw-card-third {
  position: absolute;
  inset: 0;
  transform: scale(0.88) translateY(28px);
  opacity: 0.18;
  transform-origin: bottom center;
  pointer-events: none;
}

/* ─── Action buttons (asymmetric) ─── */
.sw-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 36px;
  flex-shrink: 0;
}

.sw-action {
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.08s ease-out, border-color 0.15s, background 0.15s;
  -webkit-tap-highlight-color: transparent;
}
.sw-action:active {
  transform: translateY(1px);
}

/* Skip stop — subtle, secondary */
.sw-action-pass {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: rgba(255, 255, 255, 0.7);
  font-size: 22px;
}
.sw-action-pass:hover {
  border-color: rgba(255, 255, 255, 0.6);
  color: #fff;
}

/* Board — the ONE orange element in tunnel mode. Flat block, no glow. */
.sw-action-add {
  width: 68px;
  height: 68px;
  border-radius: 50%;
  background: var(--line-1);
  color: white;
  font-size: 26px;
}
.sw-action-add:hover { background: #F07E33; }

/* ─── Trail / hint ─── */
.sw-trail {
  margin-top: 16px;
  padding: 0 8px;
  flex-shrink: 0;
}
.sw-trail-more {
  background: var(--line-1);
  border-color: var(--line-1);
  color: #fff;
}
.sw-hint {
  font-size: 10px;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.4);
  text-align: center;
  margin: 0;
}

@media (max-height: 700px) {
  .sw-stage { max-height: 540px; }
  .sw-area  { padding: 10px 16px 14px; }
  .sw-trail { margin-top: 8px; }
  .sw-hint  { font-size: 9px; }
}
@media (max-height: 620px) {
  .sw-action-pass { width: 54px; height: 54px; font-size: 20px; }
  .sw-action-add  { width: 60px; height: 60px; font-size: 23px; }
  .sw-actions { gap: 30px; }
  .sw-trail { display: none; }
}
</style>
