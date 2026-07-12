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
            <span class="sw-count">
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

    <!-- Main -->
    <div class="sw-main">

      <!-- Loading -->
      <div v-if="loading" class="sw-state">
        <div class="sw-spinner"></div>
        <p class="sw-state-txt">Finding spots…</p>
      </div>

      <!-- Empty deck -->
      <div v-else-if="isDeckEmpty" class="sw-state">
        <div class="sw-empty">
          <p class="sw-empty-title">You've swiped through everything!</p>
          <p class="sw-empty-sub">No worries — explore another vibe.</p>
          <button class="btn-ios h-12 rounded-xl text-base shadow-lg mt-2" @click="$router.push('/plan')">Start over</button>
        </div>
      </div>

      <!-- Swipe area -->
      <div v-else class="sw-area">

        <!-- Card stack -->
        <div class="sw-stage">
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

        <!-- Actions -->
        <div class="sw-actions">
          <button
            class="sw-action sw-action-pass"
            @click="triggerButtonSwipe('nope')"
            aria-label="Pass"
          >
            <i class="fa-solid fa-xmark"></i>
          </button>

          <button
            class="sw-action sw-action-add"
            @click="triggerButtonSwipe('yep')"
            aria-label="Add to route"
          >
            <i class="fa-solid fa-heart"></i>
          </button>
        </div>

        <!-- Hint text -->
        <p class="sw-hint">
          <span class="sw-hint-line">Swipe · drag to scroll · tap photo</span>
        </p>

      </div>
    </div>
  </AppLayout>
</template>

<style scoped>
/* ─── Navy background (swipe screen only) ─── */
.sw-navy {
  background: var(--navy-swipe);
}

/* ─── Nav (dark glass on navy) ───
   Only recolour; blur/saturate stays owned by the global .glass-nav rule. */
.glass-nav {
  background: color-mix(in srgb, var(--navy-swipe) 72%, transparent);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.sw-icon-btn {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.16);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: #fff;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  flex-shrink: 0;
}
.sw-icon-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
}
.sw-icon-btn:active { transform: scale(0.94); }
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
  background: var(--orange);
  transform: scaleY(1.4);
}
.sw-count {
  font-size: 12px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.55);
  letter-spacing: 0.02em;
  white-space: nowrap;
}
.sw-count-curr { color: var(--orange); }
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
  color: var(--navy);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 14px rgba(30, 41, 59, 0.25);
  flex-shrink: 0;
}
.sw-route-btn:hover {
  background: rgba(255, 255, 255, 0.9);
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.3);
}
.sw-route-btn:active { transform: scale(0.96); }
.sw-route-btn i { font-size: 11px; }
.sw-route-label {
  font-family: 'Inter', sans-serif;
}
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
}

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
  border: 3px solid rgba(255, 140, 66, 0.18);
  border-top-color: var(--orange);
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.sw-state-txt {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
}
.sw-empty {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1.5px solid rgba(255, 255, 255, 0.8);
  border-radius: 28px;
  padding: 36px 30px;
  text-align: center;
  max-width: 360px;
  width: 100%;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.05);
}
.sw-empty-title {
  font-size: 20px;
  font-weight: 900;
  color: var(--navy);
  letter-spacing: -0.01em;
  margin-bottom: 8px;
}
.sw-empty-sub {
  font-size: 14px;
  color: rgba(30, 41, 59, 0.5);
  line-height: 1.5;
  margin-bottom: 16px;
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
.sw-card-top {
  position: absolute;
  inset: 0;
}
.sw-card-back {
  position: absolute;
  inset: 0;
  transform: scale(0.94) translateY(14px);
  opacity: 0.36;
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
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease, border-color 0.2s;
  -webkit-tap-highlight-color: transparent;
}
.sw-action:active {
  transform: scale(0.92);
}

/* Pass — subtle, secondary */
.sw-action-pass {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: #fff;
  border: 1.5px solid rgba(30, 41, 59, 0.12);
  color: rgba(30, 41, 59, 0.4);
  font-size: 22px;
  box-shadow: 0 4px 14px rgba(30, 41, 59, 0.06);
}
.sw-action-pass:hover {
  border-color: rgba(30, 41, 59, 0.25);
  color: rgba(30, 41, 59, 0.7);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(30, 41, 59, 0.1);
}

/* Add — primary, orange filled w/ glow */
.sw-action-add {
  width: 68px;
  height: 68px;
  border-radius: 50%;
  background: var(--orange);
  color: white;
  font-size: 26px;
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.25) inset,
    0 8px 22px rgba(255, 140, 66, 0.5),
    0 2px 6px rgba(255, 140, 66, 0.3);
  position: relative;
}
.sw-action-add::before {
  content: '';
  position: absolute;
  inset: -6px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 140, 66, 0.25) 0%, transparent 70%);
  z-index: -1;
  opacity: 0;
  transition: opacity 0.3s ease;
}
.sw-action-add:hover {
  transform: translateY(-3px);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.25) inset,
    0 14px 30px rgba(255, 140, 66, 0.6),
    0 4px 10px rgba(255, 140, 66, 0.35);
}
.sw-action-add:hover::before { opacity: 1; }

/* ─── Hint ─── */
.sw-hint {
  margin-top: 14px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.4);
  text-align: center;
}
.sw-hint-line {
  display: inline-block;
}

@media (max-height: 700px) {
  .sw-stage { max-height: 540px; }
  .sw-area  { padding: 10px 16px 14px; }
  .sw-hint  { margin-top: 8px; font-size: 9px; }
}
@media (max-height: 620px) {
  .sw-action-pass { width: 54px; height: 54px; font-size: 20px; }
  .sw-action-add  { width: 60px; height: 60px; font-size: 23px; }
  .sw-actions { gap: 30px; }
  .sw-hint { display: none; }
}
</style>
