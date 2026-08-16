<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  FOOD_ZONES, fetchFoodPlaces, placesInZone, rankPlaces, districtOf,
} from '@/composables/useFoodGuide'
import { setSeoHead, clearSeoHead, breadcrumbLd, restaurantListLd } from '@/composables/useSeoHead'
import { trackCTA } from '@/composables/useAnalytics'
import FoodPlaceCard from '@/components/FoodPlaceCard.vue'
// Shared with FoodZoneView — all classes are fg- prefixed, so no scoping needed
import '@/assets/food-guide.css'

const router  = useRouter()
const places  = ref([])
const loading = ref(true)   // drives the user-facing spinner
// See FoodZoneView: "finished trying" is not "has data". Only the latter may
// tell the prerender the page is ready to snapshot.
const dataOk  = ref(false)

const AGODA_CID = '1964186'
const BANGKOK_DEST = '17297'

const zoneCounts = computed(() =>
  FOOD_ZONES.map(z => ({ ...z, count: placesInZone(places.value, z).length }))
    .filter(z => z.count >= 5)          // below five is thin content, not a page
    .sort((a, b) => b.count - a.count)
)

// The page's own list: the strongest picks across the whole city
const topPicks = computed(() =>
  rankPlaces(places.value.filter(p => p.is_universal || p.is_hidden_gem)).slice(0, 12)
)

const priceBands = computed(() => {
  const bands = {}
  for (const p of places.value) {
    const k = p.price_range || '—'
    bands[k] = (bands[k] || 0) + 1
  }
  return Object.entries(bands).sort((a, b) => a[0].length - b[0].length)
})

function agodaUrl() {
  return `https://www.agoda.com/partners/partnersearch.aspx?cid=${AGODA_CID}&textToSearch=${encodeURIComponent('Bangkok')}&dest_id=${BANGKOK_DEST}`
}
function openAgoda() {
  const url = agodaUrl()
  trackCTA('food_hub_agoda', 'Bangkok', url)
  window.open(url, '_blank', 'noopener,noreferrer')
}

onMounted(async () => {
  try {
    places.value = await fetchFoodPlaces()
    dataOk.value = true
  } catch {
    dataOk.value = false   // prerender will retry, then skip this route entirely
  }
  loading.value = false

  const title = 'Where to Eat in Bangkok — 204 Places, by Neighbourhood | plzgo'
  const description =
    'A Bangkok food guide organised the way you actually eat: by neighbourhood. ' +
    'Yaowarat, Sukhumvit, Ari, Silom and more — with opening hours, price range and the nearest BTS or MRT for every place.'
  setSeoHead({
    title,
    description,
    path: '/bangkok/food',
    jsonLd: [
      breadcrumbLd([
        { name: 'plzgo', path: '/' },
        { name: 'Bangkok', path: '/bangkok/food' },
        { name: 'Food', path: '/bangkok/food' },
      ]),
      restaurantListLd({
        name: 'Where to Eat in Bangkok',
        description,
        path: '/bangkok/food',
        places: topPicks.value,
      }),
    ],
  })
})
onUnmounted(clearSeoHead)
</script>

<template>
  <!-- See FoodZoneView: signals the prerender pass that data has landed -->
  <div class="fg-root" :data-prerender-ready="String(dataOk)">

    <!-- Nav -->
    <nav class="glass-nav fg-nav">
      <div class="fg-nav-in">
        <span class="fg-logo display-cond" @click="router.push('/')">plz<span>go</span></span>
        <div class="fg-nav-links">
          <button @click="router.push('/explore')">Explore</button>
          <button @click="router.push('/plan')">Plan a Trip</button>
        </div>
        <button class="btn-ios fg-nav-cta" @click="router.push('/plan')">Build my route →</button>
      </div>
    </nav>

    <!-- Masthead -->
    <header class="fg-hero plz-dotgrid plz-glow">
      <div class="fg-wrap fg-hero-in">
        <nav class="fg-crumb data-mono" aria-label="Breadcrumb">
          <a href="/">plzgo</a> <span>/</span> <span>Bangkok</span> <span>/</span> <b>Food</b>
        </nav>
        <h1 class="fg-h1 display-cond">Where to eat<br><span class="fg-accent">in Bangkok</span></h1>
        <p class="fg-lead">
          Bangkok has more good food than any itinerary can hold, and almost none of it
          is where the "top 10" lists say it is. This guide is organised the way people
          actually eat here — by neighbourhood, so you eat what's in front of you
          instead of crossing the city for one dish.
        </p>
        <div class="fg-stats">
          <div class="fg-stat"><b>{{ loading ? '—' : places.length }}</b><span>Places</span></div>
          <div class="fg-stat"><b>{{ zoneCounts.length }}</b><span>Neighbourhoods</span></div>
          <div class="fg-stat"><b>฿</b><span>Cheapest band</span></div>
        </div>
      </div>
    </header>

    <!-- Neighbourhoods -->
    <section class="fg-sec">
      <span class="plz-secnum fg-sec-num">01</span>
      <div class="fg-wrap">
        <p class="plz-eyebrow">Start here</p>
        <h2 class="fg-h2 display-cond">Pick a neighbourhood</h2>
        <p class="fg-sec-lead">
          Each area eats differently, and at different hours. These are the eight worth
          planning a meal around.
        </p>

        <div class="fg-zone-grid">
          <a
            v-for="(z, i) in zoneCounts"
            :key="z.slug"
            class="fg-zone-card"
            :href="`/bangkok/food/${z.slug}`"
            @click.prevent="router.push(`/bangkok/food/${z.slug}`)"
          >
            <span class="fg-zone-idx" aria-hidden="true">{{ String(i + 1).padStart(2, '0') }}</span>
            <div class="fg-zone-top">
              <h3 class="fg-zone-name display-cond">{{ z.name }}</h3>
              <span class="fg-zone-count data-mono">{{ z.count }}</span>
            </div>
            <p class="fg-zone-aka data-mono">{{ z.aka }}</p>
            <p class="fg-zone-blurb">{{ z.blurb }}</p>
            <span class="fg-zone-go data-mono">Where to eat in {{ z.name }} →</span>
          </a>
        </div>
      </div>
    </section>

    <!-- Top picks -->
    <section class="fg-sec fg-sec-alt">
      <span class="plz-secnum fg-sec-num">02</span>
      <div class="fg-wrap">
        <p class="plz-eyebrow">The short list</p>
        <h2 class="fg-h2 display-cond">If you only eat twelve meals</h2>
        <p class="fg-sec-lead">
          The places worth rearranging a day for — the ones everyone should eat once,
          plus the ones most visitors walk straight past.
        </p>

        <div v-if="loading" class="fg-skeleton">Loading places…</div>
        <div v-else class="fg-list fg-col">
          <FoodPlaceCard
            v-for="(p, i) in topPicks"
            :key="p.id"
            :place="p"
            :index="i"
          />
        </div>
      </div>
    </section>

    <!-- Price guide -->
    <section class="fg-sec">
      <span class="plz-secnum fg-sec-num">03</span>
      <div class="fg-wrap">
        <p class="plz-eyebrow">What it costs</p>
        <h2 class="fg-h2 display-cond">Reading the price bands</h2>
        <p class="fg-sec-lead">
          Every place on this site carries a band rather than a number, because Bangkok
          prices move and a stale figure is worse than none.
        </p>

        <div class="fg-receipt">
          <p class="fg-receipt-head">Price guide</p>
          <div class="fg-price-row" v-for="[band, n] in priceBands" :key="band">
            <span class="fg-price-band data-mono">{{ band }}</span>
            <span class="fg-price-desc">
              {{ band === '฿' ? 'Street stalls and shophouses — under ฿150 a head'
               : band === '฿฿' ? 'Sit-down local restaurants — roughly ฿150–500'
               : band === '฿฿฿' ? 'Proper dinner out — ฿500–1,500'
               : band === '฿฿฿฿' ? 'Fine dining and hotel restaurants — ฿1,500 up'
               : 'Price not recorded' }}
            </span>
            <span class="fg-price-n data-mono">{{ n }}</span>
          </div>
          <p class="fg-price-note">
            Cash still rules at the cheap end.<br>Anything in the ฿ band, assume no card.
          </p>
        </div>
      </div>
    </section>

    <!-- Affiliate: stay near the food -->
    <section class="fg-sec fg-sec-dark plz-dotgrid">
      <div class="fg-wrap">
        <div class="fg-stay">
          <div>
            <p class="plz-eyebrow plz-eyebrow-light">Base camp</p>
            <h2 class="fg-h2 display-cond">Sleep where you want to eat</h2>
            <p class="fg-sec-lead">
              Bangkok traffic decides more of your trip than your itinerary does. Staying
              in the neighbourhood you want to eat in is the single biggest upgrade you
              can make to a food trip.
            </p>
          </div>
          <button class="btn-ios fg-stay-btn" @click="openAgoda">
            Find places to stay <i class="fa-solid fa-arrow-right ml-1.5"></i>
          </button>
        </div>
      </div>
    </section>

    <!-- CTA into the app -->
    <section class="fg-cta plz-dotgrid plz-glow">
      <div class="fg-wrap">
        <h2 class="fg-cta-h display-cond">Turn this into an actual route</h2>
        <p class="fg-cta-p">
          Reading a list is the easy part. Swipe the places you like and plzgo orders them
          by neighbourhood and time of day, drops them on a map, and hands you a link.
        </p>
        <button class="go-btn display-cond" @click="router.push('/plan')">
          Build my Bangkok route →
        </button>
      </div>
    </section>

    <footer class="fg-footer">
      <div class="fg-wrap fg-foot-in">
        <span>© 2026 <b>PLZGO.ME</b></span>
        <span><a href="/bangkok/food">Food guide</a> · <a href="/explore">Explore</a> · <a href="mailto:hello@plzgo.me">hello@plzgo.me</a></span>
      </div>
    </footer>
  </div>
</template>
