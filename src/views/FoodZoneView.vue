<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  FOOD_ZONES, zoneBySlug, fetchFoodPlaces, placesInZone, rankPlaces, displayName,
} from '@/composables/useFoodGuide'
import { setSeoHead, clearSeoHead, breadcrumbLd, restaurantListLd } from '@/composables/useSeoHead'
import { trackCTA } from '@/composables/useAnalytics'
import FoodPlaceCard from '@/components/FoodPlaceCard.vue'
import '@/assets/food-guide.css'

const route   = useRoute()
const router  = useRouter()
const all     = ref([])
const loading = ref(true)   // drives the user-facing spinner
// Separate from `loading` on purpose. If the Firestore read fails we still
// have to stop the spinner for real users, but the prerender must NOT treat
// that as a finished page — otherwise a single slow response bakes an empty
// guide into the deployed HTML while reporting success.
const dataOk  = ref(false)

const AGODA_CID = '1964186'
const BANGKOK_DEST = '17297'

const zone   = computed(() => zoneBySlug(route.params.zone))
const places = computed(() => rankPlaces(placesInZone(all.value, zone.value)))

const siblings = computed(() => FOOD_ZONES.filter(z => z.slug !== zone.value?.slug))

const cheapCount = computed(() => places.value.filter(p => p.price_range === '฿').length)
const gemCount   = computed(() => places.value.filter(p => p.is_hidden_gem).length)

function agodaUrl() {
  const q = encodeURIComponent(`${zone.value?.name || 'Bangkok'} Bangkok`)
  return `https://www.agoda.com/partners/partnersearch.aspx?cid=${AGODA_CID}&textToSearch=${q}&dest_id=${BANGKOK_DEST}`
}
function openAgoda() {
  const url = agodaUrl()
  trackCTA('food_zone_agoda', zone.value?.name || '', url)
  window.open(url, '_blank', 'noopener,noreferrer')
}

function applyHead() {
  const z = zone.value
  if (!z) return
  const n = places.value.length
  const title = `Where to Eat in ${z.name}, Bangkok — ${n || ''} Places${n ? '' : ''} | plzgo`.replace('  ', ' ')
  const description =
    `${n} places to eat in ${z.name} (${z.aka}), Bangkok — with opening hours, price range ` +
    `and the nearest BTS or MRT for each. ${z.tip}`
  setSeoHead({
    title,
    description,
    path: `/bangkok/food/${z.slug}`,
    jsonLd: [
      breadcrumbLd([
        { name: 'plzgo', path: '/' },
        { name: 'Food in Bangkok', path: '/bangkok/food' },
        { name: z.name, path: `/bangkok/food/${z.slug}` },
      ]),
      restaurantListLd({
        name: `Where to eat in ${z.name}, Bangkok`,
        description,
        path: `/bangkok/food/${z.slug}`,
        places: places.value,
      }),
    ],
  })
}

onMounted(async () => {
  try {
    all.value = await fetchFoodPlaces()
    dataOk.value = true
  } catch {
    dataOk.value = false   // prerender will retry, then skip this route entirely
  }
  loading.value = false
  applyHead()
})
// Moving between zone pages reuses this component, so the head must follow
watch(() => route.params.zone, () => { if (!loading.value) applyHead() })
onUnmounted(clearSeoHead)
</script>

<template>
  <!-- data-prerender-ready lets scripts/prerender.js wait for the Firestore
       read instead of guessing with a timer: the shell alone is enough text
       to satisfy a length heuristic, so a slow query would be captured
       mid-load and shipped as an empty page. -->
  <div class="fg-root" :data-prerender-ready="String(dataOk)">

    <nav class="glass-nav fg-nav">
      <div class="fg-nav-in">
        <span class="fg-logo display-cond" @click="router.push('/')">plz<span>go</span></span>
        <div class="fg-nav-links">
          <button @click="router.push('/bangkok/food')">Food guide</button>
          <button @click="router.push('/explore')">Explore</button>
        </div>
        <button class="btn-ios fg-nav-cta" @click="router.push('/plan')">Build my route →</button>
      </div>
    </nav>

    <template v-if="zone">
      <header class="fg-hero plz-dotgrid plz-glow">
        <div class="fg-wrap fg-hero-in">
          <nav class="fg-crumb data-mono" aria-label="Breadcrumb">
            <a href="/">plzgo</a> <span>/</span>
            <a href="/bangkok/food" @click.prevent="router.push('/bangkok/food')">Food</a> <span>/</span>
            <b>{{ zone.name }}</b>
          </nav>
          <h1 class="fg-h1 display-cond">Where to eat<br><span class="fg-accent">in {{ zone.name }}</span></h1>
          <p class="fg-lead">{{ zone.blurb }}</p>
          <div class="fg-stats">
            <div class="fg-stat"><b>{{ loading ? '—' : places.length }}</b><span>Places</span></div>
            <div class="fg-stat"><b>{{ loading ? '—' : cheapCount }}</b><span>Under ฿150</span></div>
            <div class="fg-stat"><b>{{ loading ? '—' : gemCount }}</b><span>Hidden gems</span></div>
          </div>
        </div>
      </header>

      <section class="fg-sec">
        <div class="fg-wrap">
          <div class="fg-tip">
            <span class="fg-tip-label">Local tip</span>
            <p>{{ zone.tip }}</p>
          </div>
        </div>
      </section>

      <section class="fg-sec" style="padding-top:0">
        <div class="fg-wrap">
          <p class="plz-eyebrow">The list</p>
          <h2 class="fg-h2 display-cond">Every place we'd send you to in {{ zone.name }}</h2>
          <p class="fg-sec-lead">
            Ordered so the essentials come first. Hours change without warning in Bangkok —
            treat them as a strong hint, not a contract.
          </p>

          <div v-if="loading" class="fg-skeleton">Loading places…</div>
          <div v-else-if="!places.length" class="fg-skeleton">
            No places recorded here yet.
          </div>
          <div v-else class="fg-list">
            <FoodPlaceCard v-for="(p, i) in places" :key="p.id" :place="p" :index="i" />
          </div>
        </div>
      </section>

      <section class="fg-sec fg-sec-alt">
        <div class="fg-wrap">
          <div class="fg-stay">
            <div>
              <p class="plz-eyebrow">Base camp</p>
              <h2 class="fg-h2 display-cond">Stay in {{ zone.name }}</h2>
              <p class="fg-sec-lead">
                Everything above is walkable from here. Staying in the neighbourhood you
                want to eat in saves more time than any itinerary trick.
              </p>
            </div>
            <button class="btn-ios fg-stay-btn" @click="openAgoda">
              Places to stay in {{ zone.name }} <i class="fa-solid fa-arrow-right ml-1.5"></i>
            </button>
          </div>
        </div>
      </section>

      <section class="fg-sec">
        <div class="fg-wrap">
          <p class="plz-eyebrow">Keep going</p>
          <h2 class="fg-h2 display-cond">Other neighbourhoods</h2>
          <div class="fg-siblings">
            <a
              v-for="z in siblings"
              :key="z.slug"
              class="fg-sibling"
              :href="`/bangkok/food/${z.slug}`"
              @click.prevent="router.push(`/bangkok/food/${z.slug}`)"
            >{{ z.name }}</a>
          </div>
        </div>
      </section>

      <section class="fg-cta plz-dotgrid plz-glow">
        <div class="fg-wrap">
          <h2 class="fg-cta-h display-cond">Eat {{ zone.name }} in one afternoon</h2>
          <p class="fg-cta-p">
            Swipe the places you want, and plzgo orders them by walking distance and time
            of day so you're not crossing the neighbourhood twice.
          </p>
          <button class="go-btn display-cond" @click="router.push('/plan')">
            Build my route →
          </button>
        </div>
      </section>
    </template>

    <!-- Unknown slug -->
    <div v-else class="fg-wrap fg-notfound">
      <h1 class="fg-h2 display-cond">No guide for that neighbourhood.</h1>
      <p class="fg-sec-lead" style="margin:12px auto 24px">
        It may have moved, or we may not cover it yet.
      </p>
      <button class="btn-ios fg-stay-btn" @click="router.push('/bangkok/food')">
        Back to the food guide
      </button>
    </div>

    <footer class="fg-footer">
      <div class="fg-wrap fg-foot-in">
        <span>© 2026 <b>PLZGO.ME</b></span>
        <span><a href="/bangkok/food">Food guide</a> · <a href="/explore">Explore</a> · <a href="mailto:hello@plzgo.me">hello@plzgo.me</a></span>
      </div>
    </footer>
  </div>
</template>
