<script setup>
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { db } from '@/firebase'
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore'
import { trackCTA } from '@/composables/useAnalytics'

const router = useRouter()
const issue   = ref(null)
const loading = ref(true)

// Current month → YYYY-MM. Try that doc first; fall back to the latest published issue.
function currentIssueId() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

async function loadIssue() {
  const tryIds = [currentIssueId(), '2026-06']  // 2026-06 acts as launch fallback
  for (const id of tryIds) {
    const snap = await getDoc(doc(db, 'issues', id))
    if (snap.exists() && snap.data().is_published) { issue.value = snap.data(); return }
  }
  // Last resort: any latest published
  const q = query(collection(db, 'issues'), where('is_published', '==', true), orderBy('issue_id', 'desc'), limit(1))
  const r = await getDocs(q)
  if (!r.empty) issue.value = r.docs[0].data()
}

// Sponsored top-list slots get a different visual treatment (warm bg + IG icon).
const sponsoredRanks = computed(() => new Set((issue.value?.top_list || []).filter(t => t.is_sponsored).map(t => t.rank)))

onMounted(async () => {
  try { await loadIssue() } catch (e) { console.warn('issue load failed', e) }
  loading.value = false
  // Defer observer until after DOM has the new sections.
  requestAnimationFrame(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('in') })
    }, { threshold: 0.1 })
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el))
  })
})

function goToPlan() {
  trackCTA('explore_to_plan', 'Start Swiping from Explore')
  router.push('/plan')
}

function onAdClick(type, label, url) {
  trackCTA(type, label, url || '')
  if (url && url !== '#') window.open(url, '_blank', 'noopener,noreferrer')
}

// First letter of a name, for the no-photo placeholder tile. Skips leading
// non-letters (e.g. "[ HOT — … ]" slots) so it shows a real initial, not a bracket.
function initial(str) {
  const m = (str || '').match(/[A-Za-z]/)
  return m ? m[0].toUpperCase() : 'P'
}
</script>

<template>
  <div class="explore-root">
    <!-- Header Nav -->
    <nav class="nav-minimal">
      <div class="nav-content">
        <router-link to="/" class="logo">plz<span>go</span></router-link>
        <div class="nav-links">
          <router-link to="/plan">Plan</router-link>
          <router-link to="/explore" class="active">Explore</router-link>
        </div>
        <button class="cta-outline" @click="goToPlan">Start Trip</button>
      </div>
    </nav>

    <template v-if="issue">
      <!-- Hero -->
      <header class="hero-minimal">
        <div class="hero-container reveal">
          <div class="issue-tag">{{ issue.issue_label }}</div>
          <h1 class="hero-title">
            {{ issue.hero.title_top }}<br />
            <span class="italic">{{ issue.hero.title_italic }}</span>
          </h1>
          <p class="hero-intro">{{ issue.hero.intro }}</p>
        </div>
      </header>

      <!-- D1 · Anchor Header Banner — Ambient Sponsor Slot -->
      <section v-if="issue.header_banner?.is_active" class="banner-anchor reveal">
        <div class="banner-glass" :class="{ 'banner-empty': !issue.header_banner.sponsor_brand }">
          <div class="banner-label">{{ issue.header_banner.ad_label }}</div>
          <div class="banner-brand">
            <template v-if="issue.header_banner.sponsor_brand">
              <a v-if="issue.header_banner.sponsor_url"
                 :href="issue.header_banner.sponsor_url"
                 target="_blank" rel="noopener noreferrer"
                 @click="onAdClick('banner_sponsor', issue.header_banner.sponsor_brand, issue.header_banner.sponsor_url)">
                {{ issue.header_banner.sponsor_brand }}
              </a>
              <span v-else>{{ issue.header_banner.sponsor_brand }}</span>
              <a v-if="issue.header_banner.sponsor_ig" :href="issue.header_banner.sponsor_ig" target="_blank" rel="noopener noreferrer" class="banner-ig">
                <i class="fa-brands fa-instagram"></i>
              </a>
            </template>
            <span v-else class="banner-placeholder">{{ issue.header_banner.placeholder }}</span>
          </div>
          <div class="banner-tag">{{ issue.header_banner.tagline }}</div>
        </div>
      </section>

      <!-- Spotlight -->
      <section class="spotlight reveal">
        <div class="spotlight-grid">
          <div class="spotlight-img-wrap">
            <img v-if="issue.spotlight.img" :src="issue.spotlight.img" :alt="issue.spotlight.title" />
            <div v-else class="img-ph"><span class="img-ph-letter">{{ initial(issue.spotlight.title) }}</span><span class="img-ph-mark">plzgo</span></div>
            <div class="img-caption">{{ issue.spotlight.img_caption }}</div>
          </div>
          <div class="spotlight-content">
            <div class="eyebrow">{{ issue.spotlight.eyebrow }}</div>
            <h2>{{ issue.spotlight.title }} <span class="italic">{{ issue.spotlight.title_italic }}</span></h2>
            <p>{{ issue.spotlight.copy }}</p>
            <button class="text-link" @click="goToPlan">{{ issue.spotlight.cta_text }} <i class="fa-solid fa-arrow-right"></i></button>
          </div>
        </div>
      </section>

      <!-- D2 · The Top 10 (slots 02/05/08 = Native Ads) -->
      <section class="editorial-list">
        <div class="container">
          <div class="section-header reveal">
            <h2 class="section-title">{{ issue.top_list_title || 'The' }} <span class="italic">{{ issue.top_list_italic || 'June List' }}</span></h2>
            <p>{{ issue.top_list_copy || "Ten places you can't miss this month." }}</p>
          </div>

          <div class="list-container">
            <article
              v-for="item in issue.top_list"
              :key="item.rank"
              class="list-item reveal"
              :class="{ 'list-item-sponsored': item.is_sponsored }"
            >
              <div class="item-rank">{{ item.rank }}</div>
              <div class="item-img">
                <img v-if="item.img" :src="item.img" :alt="item.name" />
                <div v-else class="img-ph img-ph-dark"><span class="img-ph-letter">{{ initial(item.name) }}</span><span class="img-ph-mark">plzgo</span></div>
                <a v-if="item.is_sponsored && item.partner_url"
                   :href="item.partner_url" target="_blank"
                   class="item-ig"
                   @click.stop="onAdClick('top10_partner_ig', item.name, item.partner_url)">
                  <i class="fa-brands fa-instagram"></i>
                </a>
              </div>
              <div class="item-info">
                <div class="item-tag" :class="{ 'item-tag-sponsored': item.is_sponsored }">
                  <span v-if="item.is_sponsored" class="ad-dot"></span>
                  {{ item.is_sponsored ? item.ad_label : item.tag }}
                </div>
                <h3>{{ item.name }}</h3>
                <div class="item-zone">
                  {{ item.zone }}
                  <a v-if="item.is_sponsored && item.partner_ig"
                     :href="item.partner_url" target="_blank"
                     class="partner-handle"
                     @click="onAdClick('top10_partner_handle', item.name, item.partner_url)">
                    · {{ item.partner_ig }}
                  </a>
                </div>
                <p>{{ item.desc }}</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <!-- D3 · Hospitality Showcase — Where to Sleep This Month -->
      <section class="hospitality-section">
        <div class="container">
          <div class="section-header reveal">
            <div class="eyebrow eyebrow-dark">Where to Sleep</div>
            <h2 class="section-title-dark">
              {{ issue.hospitality.section_title }}
              <span class="italic">{{ issue.hospitality.section_italic }}</span>
            </h2>
            <p class="section-copy">{{ issue.hospitality.section_copy }}</p>
          </div>

          <div class="hosp-grid">
            <div
              v-for="col in issue.hospitality.columns"
              :key="col.key"
              class="hosp-col reveal"
              :class="`hosp-col-${col.key}`"
            >
              <div class="hosp-col-head">
                <div class="hosp-monogram italic">{{ col.accent_letter }}</div>
                <div>
                  <h3 class="hosp-col-title">{{ col.category_label }}</h3>
                  <p class="hosp-col-copy">{{ col.category_copy }}</p>
                </div>
              </div>

              <div class="hosp-cards">
                <article
                  v-for="hotel in col.hotels"
                  :key="hotel.name"
                  class="hosp-card"
                  :class="{ 'hosp-card-sponsored': hotel.is_sponsored }"
                >
                  <div class="hosp-card-img">
                    <img v-if="hotel.img" :src="hotel.img" :alt="hotel.name" />
                    <div v-else class="img-ph"><span class="img-ph-letter">{{ initial(hotel.name) }}</span><span class="img-ph-mark">plzgo</span></div>
                    <div v-if="hotel.is_sponsored" class="hosp-badge">{{ hotel.ad_label }}</div>
                  </div>
                  <div class="hosp-card-body">
                    <h4 class="hosp-card-name">{{ hotel.name }}</h4>
                    <div class="hosp-card-meta">
                      <span class="hosp-zone">{{ hotel.zone }}</span>
                      <a v-if="hotel.ig && hotel.ig_url"
                         :href="hotel.ig_url" target="_blank"
                         class="hosp-ig"
                         @click="onAdClick('hosp_ig', hotel.name, hotel.ig_url)">
                        {{ hotel.ig }}
                      </a>
                    </div>
                    <p class="hosp-deal">{{ hotel.deal }}</p>
                    <button
                      class="hosp-cta"
                      :class="{ 'hosp-cta-sponsored': hotel.is_sponsored }"
                      :disabled="!hotel.agoda_url && !hotel.ig_url"
                      @click="onAdClick(hotel.agoda_url ? 'hosp_agoda_affiliate' : 'hosp_book', hotel.name, hotel.agoda_url || hotel.ig_url)"
                    >
                      {{ hotel.is_sponsored ? 'See Deal' : 'Book on Agoda' }}
                      <i class="fa-solid fa-arrow-right"></i>
                    </button>
                  </div>
                </article>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- D4 · Event Ticket Conversion Gate -->
      <section class="events-section">
        <div class="container">
          <div class="section-header reveal">
            <h2 class="section-title">
              {{ issue.events.section_title }}
              <span class="italic">{{ issue.events.section_italic }}</span>
            </h2>
            <p>{{ issue.events.section_copy }}</p>
          </div>

          <!-- Featured event card -->
          <article class="evt-featured reveal" :class="{ 'evt-sponsored': issue.events.featured.is_sponsored }">
            <div class="evt-featured-img">
              <img v-if="issue.events.featured.img" :src="issue.events.featured.img" :alt="issue.events.featured.name" />
              <div v-else class="img-ph"><span class="img-ph-letter">{{ initial(issue.events.featured.name) }}</span><span class="img-ph-mark">plzgo</span></div>
              <div class="evt-date-pill">{{ issue.events.featured.date_label }}</div>
            </div>
            <div class="evt-featured-body">
              <div class="eyebrow">{{ issue.events.featured.is_sponsored ? issue.events.featured.ad_label : 'Featured Event' }}</div>
              <h3>{{ issue.events.featured.name }}</h3>
              <div class="evt-venue"><i class="fa-solid fa-location-dot"></i> {{ issue.events.featured.venue }}</div>
              <p>{{ issue.events.featured.copy }}</p>
              <button
                class="evt-cta"
                @click="onAdClick('event_featured', issue.events.featured.name, issue.events.featured.cta_url)"
              >
                {{ issue.events.featured.cta_label }}
                <i class="fa-solid fa-arrow-right"></i>
              </button>
              <div v-if="issue.events.featured.ticket_partner" class="evt-partner">
                via {{ issue.events.featured.ticket_partner }}
              </div>
            </div>
          </article>

          <!-- Side events grid -->
          <div class="evt-side-grid">
            <article
              v-for="ev in issue.events.side"
              :key="ev.name"
              class="evt-card reveal"
              :class="{ 'evt-sponsored': ev.is_sponsored }"
            >
              <div class="evt-card-img">
                <img v-if="ev.img" :src="ev.img" :alt="ev.name" />
                <div v-else class="img-ph"><span class="img-ph-letter">{{ initial(ev.name) }}</span><span class="img-ph-mark">plzgo</span></div>
                <div v-if="ev.is_sponsored" class="evt-sponsored-badge">{{ ev.ad_label }}</div>
              </div>
              <div class="evt-card-body">
                <div class="evt-date">{{ ev.date_label }}</div>
                <h4>{{ ev.name }}</h4>
                <div class="evt-venue-small">{{ ev.venue }}</div>
                <p>{{ ev.copy }}</p>
                <button
                  class="evt-cta-small"
                  :class="{ 'evt-cta-sponsored': ev.is_sponsored }"
                  @click="onAdClick('event_side', ev.name, ev.cta_url)"
                >
                  {{ ev.cta_label }}
                </button>
                <div v-if="ev.ticket_partner" class="evt-partner-small">via {{ ev.ticket_partner }}</div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <!-- Scene -->
      <section class="scene-section" id="gay">
        <div class="container">
          <div class="section-header reveal">
            <div class="pride-bar"></div>
            <h2 class="section-title">
              {{ issue.scene.section_title }}
              <span class="italic">{{ issue.scene.section_italic }}</span>
            </h2>
            <p>{{ issue.scene.section_copy }}</p>
          </div>

          <div class="scene-grid">
            <div v-for="spot in issue.scene.spots" :key="spot.name" class="scene-card reveal">
              <div class="scene-img">
                <img v-if="spot.img" :src="spot.img" :alt="spot.name" />
                <div v-else class="img-ph"><span class="img-ph-letter">{{ initial(spot.name) }}</span><span class="img-ph-mark">plzgo</span></div>
                <a :href="spot.url" target="_blank" class="ig-link"
                   @click="onAdClick('scene_ig', spot.name, spot.url)">
                  <i class="fa-brands fa-instagram"></i>
                </a>
              </div>
              <div class="scene-body">
                <h3>{{ spot.name }}</h3>
                <a :href="spot.url" target="_blank" class="handle">{{ spot.handle }}</a>
                <p>{{ spot.desc }}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- D5 · Neighborhood + Sponsored Slot 04 -->
      <section class="hood-section">
        <div class="hood-container reveal">
          <div class="hood-content">
            <div class="eyebrow">{{ issue.neighborhood.eyebrow }}</div>
            <h2>{{ issue.neighborhood.title }}<span class="italic">{{ issue.neighborhood.title_italic }}</span></h2>
            <p>{{ issue.neighborhood.copy }}</p>
            <div class="hood-quick">
              <div
                v-for="q in issue.neighborhood.quick_list"
                :key="q.rank"
                class="q-item"
                :class="{ 'q-item-sponsored': q.is_sponsored }"
              >
                <span class="q-rank">{{ q.rank }}</span>
                <a v-if="q.is_sponsored && q.sponsor_url"
                   :href="q.sponsor_url" target="_blank"
                   class="q-name-link"
                   @click="onAdClick('hood_sponsor', q.name, q.sponsor_url)"
                >
                  {{ q.name }}
                  <i class="fa-brands fa-instagram q-ig"></i>
                </a>
                <span v-else class="q-name">{{ q.name }}</span>
                <span v-if="q.is_sponsored" class="q-ad-label">{{ q.ad_label }}</span>
              </div>
            </div>
            <button class="btn-dark" @click="goToPlan">{{ issue.neighborhood.cta_label }}</button>
          </div>
          <div class="hood-visual">
            <img v-if="issue.neighborhood.img" :src="issue.neighborhood.img" :alt="issue.neighborhood.name" />
            <div v-else class="img-ph"><span class="img-ph-letter">{{ initial(issue.neighborhood.name) }}</span><span class="img-ph-mark">plzgo</span></div>
          </div>
        </div>
      </section>
    </template>

    <!-- Loading state -->
    <div v-else-if="loading" class="explore-loading">
      <div class="loader-dot"></div>
      <p>Loading this month's issue…</p>
    </div>

    <!-- Footer -->
    <footer class="explore-footer">
      <div class="footer-content reveal">
        <h2>Stop overthinking. <span class="italic">Just go.</span></h2>
        <p>Your optimized Bangkok trip is only a few swipes away.</p>
        <button class="btn-primary" @click="goToPlan">Start My Trip</button>
        <div class="footer-meta">
          <div class="logo">plz<span>go</span></div>
          <p>© 2026 Plzgo Team. Curated by humans in Bangkok.</p>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@1,9..144,400;1,9..144,700&family=Inter:wght@400;600;800;900&display=swap');

.explore-root {
  --black:        #0F172A;
  --white:        #FFFFFF;
  --cream:        #F8FAFC;
  --orange:       #FF8C42;
  --grey:         #64748B;
  --light-grey:   #E2E8F0;
  --gold:         #D4A045;       /* sponsored accent on dark sections */
  --warm-bg:      #FFF7ED;       /* sponsored accent on light sections */
  --gay-pink:     #E11D74;       /* queer accent */
  --pride-gradient: linear-gradient(90deg, #ff0000, #ff8c00, #ffed00, #008026, #004cff, #732982);

  font-family: 'Inter', sans-serif;
  background-color: var(--white);
  color: var(--black);
  -webkit-font-smoothing: antialiased;
}

.italic {
  font-family: 'Fraunces', serif;
  font-style: italic;
  font-weight: 400;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

/* --- Loading --- */
.explore-loading {
  min-height: 60vh;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 16px;
  color: var(--grey);
}
.loader-dot {
  width: 14px; height: 14px; border-radius: 50%;
  background: var(--orange);
  animation: pulse 1s infinite ease-in-out;
}
@keyframes pulse {
  0%,100% { transform: scale(0.8); opacity: 0.6; }
  50%     { transform: scale(1.2); opacity: 1; }
}

/* --- Navigation --- */
.nav-minimal {
  position: fixed;
  top: 0; left: 0; right: 0;
  height: 80px;
  z-index: 100;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--light-grey);
}
.nav-content {
  max-width: 1200px; margin: 0 auto; height: 100%;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 24px;
}
.logo {
  font-weight: 900; font-size: 24px;
  letter-spacing: -0.04em;
  text-decoration: none; color: var(--black);
}
.logo span { color: var(--orange); }

.nav-links { display: flex; gap: 32px; }
.nav-links a {
  font-size: 14px; font-weight: 600;
  text-decoration: none; color: var(--grey);
  transition: color 0.2s;
}
.nav-links a.active { color: var(--black); }
.nav-links a:hover { color: var(--orange); }

.cta-outline {
  padding: 10px 20px;
  border: 1.5px solid var(--black);
  background: transparent;
  border-radius: 99px;
  font-size: 13px; font-weight: 700;
  cursor: pointer; transition: all 0.2s;
}
.cta-outline:hover { background: var(--black); color: var(--white); }

/* --- Hero --- */
.hero-minimal {
  padding: 180px 24px 80px;
  background-color: var(--cream);
  text-align: center;
}
.issue-tag {
  font-size: 11px; font-weight: 800; text-transform: uppercase;
  letter-spacing: 0.2em; color: var(--orange);
  margin-bottom: 16px;
}
.hero-title {
  font-size: clamp(60px, 12vw, 120px);
  font-weight: 900; line-height: 0.85;
  letter-spacing: -0.05em;
  margin-bottom: 40px;
}
.hero-intro {
  max-width: 600px; margin: 0 auto;
  font-size: 18px; line-height: 1.6;
  color: var(--grey); font-weight: 500;
}

/* --- D1 · Anchor Header Banner (Ambient Glass) --- */
.banner-anchor {
  background-color: var(--cream);
  padding: 0 24px 80px;
}
.banner-glass {
  max-width: 900px; margin: 0 auto;
  padding: 24px 32px;
  display: flex; align-items: center; justify-content: space-between;
  gap: 24px;
  background: rgba(255,255,255,0.55);
  backdrop-filter: blur(20px) saturate(140%);
  -webkit-backdrop-filter: blur(20px) saturate(140%);
  border: 1px solid rgba(255,255,255,0.7);
  border-radius: 18px;
  box-shadow: 0 8px 32px rgba(15, 23, 42, 0.06);
  position: relative;
  overflow: hidden;
}
.banner-glass::before {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(135deg, rgba(255,140,66,0.06) 0%, rgba(225,29,116,0.04) 100%);
  pointer-events: none;
}
.banner-empty .banner-brand a,
.banner-empty .banner-brand span {
  color: var(--orange);
  font-style: italic;
  font-family: 'Fraunces', serif;
}
.banner-label {
  font-size: 10px; font-weight: 900;
  text-transform: uppercase; letter-spacing: 0.22em;
  color: var(--grey);
  white-space: nowrap;
}
.banner-brand {
  flex: 1; text-align: center;
  font-size: clamp(18px, 3vw, 24px);
  font-weight: 900;
  color: var(--black);
  display: flex; align-items: center; justify-content: center; gap: 12px;
}
.banner-brand a { color: var(--black); text-decoration: none; transition: color 0.2s; }
.banner-brand a:hover { color: var(--orange); }
.banner-ig {
  width: 28px; height: 28px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 50%; background: var(--black); color: var(--white) !important;
  font-size: 13px;
}
.banner-placeholder { opacity: 0.85; }
.banner-tag {
  font-size: 10px; font-weight: 700; color: var(--grey);
  text-transform: uppercase; letter-spacing: 0.18em;
  white-space: nowrap;
}
@media (max-width: 720px) {
  .banner-glass { flex-direction: column; gap: 8px; padding: 20px; text-align: center; }
}

/* --- Spotlight --- */
.spotlight { padding: 80px 0 100px; }
.spotlight-grid {
  display: grid; grid-template-columns: 1fr; gap: 60px;
  align-items: center;
  max-width: 1200px; margin: 0 auto; padding: 0 24px;
}
@media (min-width: 900px) {
  .spotlight-grid { grid-template-columns: 1.2fr 1fr; }
}
.spotlight-img-wrap { position: relative; aspect-ratio: 16/10; }
.spotlight-img-wrap img {
  width: 100%; height: 100%;
  object-fit: cover; border-radius: 8px;
}
.spotlight-img-wrap .img-ph { border-radius: 8px; }
.img-caption {
  position: absolute; bottom: -24px; right: 0;
  font-family: 'Fraunces', serif; font-style: italic;
  font-size: 14px; color: var(--grey);
}
.eyebrow {
  font-size: 11px; font-weight: 800;
  text-transform: uppercase; letter-spacing: 0.2em;
  color: var(--orange);
  margin-bottom: 12px;
}
.eyebrow-dark { color: var(--gold); }
.spotlight-content h2 {
  font-size: clamp(40px, 6vw, 64px);
  font-weight: 900; line-height: 1;
  margin-bottom: 24px; letter-spacing: -0.03em;
}
.spotlight-content p {
  font-size: 16px; line-height: 1.7;
  color: var(--grey); margin-bottom: 32px;
}
.text-link {
  font-size: 16px; font-weight: 800; color: var(--black);
  background: none; border: none; cursor: pointer; padding: 0;
  display: flex; align-items: center; gap: 8px;
  transition: gap 0.2s;
}
.text-link:hover { gap: 14px; color: var(--orange); }

/* --- D2 · Top 10 List (with sponsored variant) --- */
.editorial-list {
  padding: 120px 0;
  background-color: var(--black);
  color: var(--white);
}
.section-header { margin-bottom: 80px; }
.section-title {
  font-size: clamp(48px, 8vw, 80px);
  font-weight: 900; letter-spacing: -0.04em;
  margin-bottom: 12px;
}
.section-title-dark { color: var(--black); }
.section-copy { color: var(--grey); }

.list-container { display: flex; flex-direction: column; }
.list-item {
  display: grid;
  grid-template-columns: 80px 1fr;
  gap: 40px;
  padding: 60px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  align-items: center;
  position: relative;
}
@media (min-width: 768px) {
  .list-item { grid-template-columns: 80px 240px 1fr; }
}

/* Sponsored variant — warm ambient background, gold rank */
.list-item-sponsored::before {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(90deg, rgba(212,160,69,0.08) 0%, rgba(212,160,69,0) 60%);
  pointer-events: none;
  border-top: 1px solid rgba(212, 160, 69, 0.3);
  margin-top: -1px;
}
.list-item-sponsored > * { position: relative; z-index: 1; }

.item-rank {
  font-family: 'Fraunces', serif;
  font-style: italic;
  font-size: 40px;
  color: rgba(255, 255, 255, 0.3);
}
.list-item-sponsored .item-rank { color: var(--gold); }

.item-img {
  position: relative;
  aspect-ratio: 1;
}
.item-img img {
  width: 100%; height: 100%;
  object-fit: cover; border-radius: 4px;
}
.item-img .img-ph { border-radius: 4px; }
.item-ig {
  position: absolute;
  top: 10px; right: 10px;
  width: 36px; height: 36px;
  background: rgba(255,255,255,0.95);
  color: var(--black);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  text-decoration: none;
  font-size: 16px;
  transition: all 0.2s;
}
.item-ig:hover { background: var(--gold); color: var(--white); }

.item-tag {
  font-size: 10px; font-weight: 900;
  text-transform: uppercase; letter-spacing: 0.15em;
  color: var(--orange);
  margin-bottom: 8px;
  display: inline-flex; align-items: center; gap: 6px;
}
.item-tag-sponsored {
  color: var(--gold);
  background: rgba(212, 160, 69, 0.12);
  padding: 4px 10px; border-radius: 4px;
}
.ad-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--gold);
  box-shadow: 0 0 0 3px rgba(212,160,69,0.25);
  display: inline-block;
}
.item-info h3 {
  font-size: 28px; font-weight: 900;
  margin-bottom: 4px;
}
.item-zone {
  font-size: 13px; font-weight: 700;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 16px;
}
.partner-handle {
  color: var(--gold);
  text-decoration: none;
  transition: color 0.2s;
}
.partner-handle:hover { color: var(--orange); }
.item-info p {
  font-size: 15px; line-height: 1.6;
  color: rgba(255, 255, 255, 0.7);
  max-width: 500px;
}

/* --- D3 · Hospitality Showcase --- */
.hospitality-section {
  padding: 120px 0;
  background: var(--cream);
}
.hosp-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 32px;
}
@media (min-width: 900px) {
  .hosp-grid { grid-template-columns: repeat(3, 1fr); }
}

.hosp-col {
  display: flex; flex-direction: column;
  gap: 20px;
}
.hosp-col-head {
  display: flex; gap: 14px; align-items: flex-start;
  padding-bottom: 16px;
  border-bottom: 2px solid var(--black);
}
.hosp-monogram {
  font-size: 44px; line-height: 0.85;
  color: var(--orange);
  letter-spacing: -0.04em;
  flex-shrink: 0;
  min-width: 32px;
}
.hosp-col-pride .hosp-monogram { color: var(--gay-pink); }
.hosp-col-title {
  font-size: 18px; font-weight: 900;
  letter-spacing: -0.01em;
  margin-bottom: 4px;
  line-height: 1.2;
}
.hosp-col-copy {
  font-size: 13px; color: var(--grey);
  font-weight: 600; line-height: 1.4;
  margin: 0;
}
/* Pride column gets the rainbow accent bar */
.hosp-col-pride .hosp-col-head { border-bottom-color: transparent; position: relative; }
.hosp-col-pride .hosp-col-head::after {
  content: ''; position: absolute; bottom: 0; left: 0; right: 0;
  height: 3px; background: var(--pride-gradient);
}

.hosp-cards {
  display: flex; flex-direction: column;
  gap: 16px;
}

.hosp-card {
  background: var(--white);
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--light-grey);
  transition: all 0.25s cubic-bezier(0.16,1,0.3,1);
  display: flex; flex-direction: column;
}
.hosp-card:hover { transform: translateY(-4px); box-shadow: 0 16px 40px -12px rgba(15,23,42,0.12); }

.hosp-card-sponsored {
  background: var(--warm-bg);
  border: 1.5px solid var(--orange);
  box-shadow: 0 10px 32px -8px rgba(255, 140, 66, 0.25);
  position: relative;
}

.hosp-card-img {
  position: relative;
  aspect-ratio: 16/10;
}
.hosp-card-img img {
  width: 100%; height: 100%; object-fit: cover;
}
.hosp-badge {
  position: absolute; top: 12px; left: 12px;
  padding: 5px 10px; border-radius: 99px;
  background: var(--orange); color: var(--white);
  font-size: 9px; font-weight: 900;
  text-transform: uppercase; letter-spacing: 0.15em;
  box-shadow: 0 4px 12px rgba(255,140,66,0.4);
}
.hosp-col-pride .hosp-card-sponsored .hosp-badge { background: var(--gay-pink); box-shadow: 0 4px 12px rgba(225,29,116,0.4); }

.hosp-card-body {
  padding: 18px 20px 20px;
  display: flex; flex-direction: column;
  flex: 1;
}
.hosp-card-name {
  font-size: 16px; font-weight: 900;
  margin: 0 0 6px;
  letter-spacing: -0.01em;
  line-height: 1.25;
}
.hosp-card-meta {
  display: flex; align-items: center; gap: 8px;
  font-size: 11px; font-weight: 700;
  margin-bottom: 10px;
  flex-wrap: wrap;
}
.hosp-zone {
  color: var(--grey);
  text-transform: uppercase; letter-spacing: 0.1em;
}
.hosp-ig {
  color: var(--orange);
  text-decoration: none;
}
.hosp-ig:hover { text-decoration: underline; }
.hosp-deal {
  font-size: 13px; color: var(--black);
  font-weight: 600; line-height: 1.5;
  margin: 0 0 14px;
  flex: 1;
}
.hosp-cta {
  background: var(--black); color: var(--white);
  border: none; padding: 10px 16px;
  border-radius: 99px;
  font-size: 12px; font-weight: 800;
  cursor: pointer;
  display: flex; align-items: center; gap: 8px;
  justify-content: center;
  transition: all 0.2s;
}
.hosp-cta:hover { gap: 12px; background: var(--orange); }
.hosp-cta-sponsored { background: var(--orange); }
.hosp-cta-sponsored:hover { background: var(--black); }
.hosp-cta:disabled {
  background: var(--light-grey);
  color: var(--grey);
  cursor: not-allowed;
  opacity: 0.6;
}
.hosp-cta:disabled:hover { background: var(--light-grey); }

/* --- D4 · Events Section --- */
.events-section {
  padding: 120px 0;
  background: var(--white);
}
.evt-featured {
  display: grid; grid-template-columns: 1fr;
  gap: 48px; align-items: center;
  margin-bottom: 80px;
}
@media (min-width: 900px) {
  .evt-featured { grid-template-columns: 1.2fr 1fr; gap: 64px; }
}
.evt-featured-img {
  position: relative;
  aspect-ratio: 16/11;
  border-radius: 12px; overflow: hidden;
}
.evt-featured-img img { width: 100%; height: 100%; object-fit: cover; }
.evt-date-pill {
  position: absolute; top: 16px; left: 16px;
  padding: 10px 16px; border-radius: 99px;
  background: var(--white); color: var(--black);
  font-size: 12px; font-weight: 800;
  letter-spacing: 0.04em;
  box-shadow: 0 6px 20px rgba(0,0,0,0.1);
}
.evt-featured-body h3 {
  font-size: clamp(32px, 5vw, 48px);
  font-weight: 900; line-height: 1.05;
  letter-spacing: -0.03em;
  margin: 8px 0 16px;
}
.evt-venue {
  font-size: 13px; font-weight: 700;
  color: var(--grey);
  margin-bottom: 18px;
  display: flex; align-items: center; gap: 6px;
}
.evt-venue i { color: var(--orange); }
.evt-featured-body p {
  font-size: 16px; line-height: 1.6;
  color: var(--grey);
  margin: 0 0 28px;
}
.evt-cta {
  background: var(--orange); color: var(--white);
  border: none;
  padding: 16px 32px;
  border-radius: 99px;
  font-size: 15px; font-weight: 800;
  cursor: pointer;
  display: inline-flex; align-items: center; gap: 10px;
  box-shadow: 0 12px 28px rgba(255,140,66,0.3);
  transition: all 0.25s;
}
.evt-cta:hover { transform: translateY(-2px); box-shadow: 0 18px 36px rgba(255,140,66,0.4); }
.evt-partner {
  margin-top: 14px;
  font-size: 11px; color: var(--grey); font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.12em;
}

/* sponsored featured event = pink accent */
.evt-featured.evt-sponsored .evt-cta { background: var(--gay-pink); box-shadow: 0 12px 28px rgba(225,29,116,0.3); }
.evt-featured.evt-sponsored .evt-venue i { color: var(--gay-pink); }
.evt-featured.evt-sponsored .eyebrow { color: var(--gay-pink); }

.evt-side-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
}
@media (min-width: 700px) {
  .evt-side-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (min-width: 1000px) {
  .evt-side-grid { grid-template-columns: repeat(3, 1fr); }
}
.evt-card {
  background: var(--cream);
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--light-grey);
  display: flex; flex-direction: column;
  transition: transform 0.25s ease;
}
.evt-card:hover { transform: translateY(-6px); }
.evt-card.evt-sponsored {
  background: var(--warm-bg);
  border: 1.5px solid var(--orange);
  box-shadow: 0 10px 28px -8px rgba(255,140,66,0.22);
}
.evt-card-img {
  position: relative;
  aspect-ratio: 16/9;
}
.evt-card-img img { width: 100%; height: 100%; object-fit: cover; }
.evt-sponsored-badge {
  position: absolute; top: 12px; right: 12px;
  padding: 5px 10px; border-radius: 99px;
  background: var(--orange); color: var(--white);
  font-size: 9px; font-weight: 900;
  text-transform: uppercase; letter-spacing: 0.15em;
}
.evt-card-body {
  padding: 18px 20px 22px;
  display: flex; flex-direction: column;
  flex: 1;
}
.evt-date {
  font-size: 11px; font-weight: 900;
  color: var(--orange);
  text-transform: uppercase; letter-spacing: 0.15em;
  margin-bottom: 8px;
}
.evt-card-body h4 {
  font-size: 18px; font-weight: 900;
  margin: 0 0 6px;
  letter-spacing: -0.01em;
  line-height: 1.2;
}
.evt-venue-small {
  font-size: 12px; color: var(--grey);
  font-weight: 700;
  margin-bottom: 10px;
}
.evt-card-body p {
  font-size: 13px; color: var(--grey);
  line-height: 1.5;
  margin: 0 0 14px;
  flex: 1;
}
.evt-cta-small {
  align-self: flex-start;
  background: var(--black); color: var(--white);
  border: none;
  padding: 9px 18px; border-radius: 99px;
  font-size: 12px; font-weight: 800;
  cursor: pointer;
  transition: all 0.2s;
}
.evt-cta-small:hover { background: var(--orange); }
.evt-cta-sponsored { background: var(--orange); }
.evt-cta-sponsored:hover { background: var(--black); }
.evt-partner-small {
  margin-top: 10px;
  font-size: 10px; color: var(--grey);
  font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.12em;
}

/* --- Scene Section --- */
.scene-section {
  padding: 120px 0;
  background-color: var(--white);
}
.pride-bar {
  width: 60px; height: 4px;
  background: var(--pride-gradient);
  margin-bottom: 16px;
}
.scene-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 32px;
}
.scene-card {
  background: var(--cream);
  border-radius: 12px;
  overflow: hidden;
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.scene-card:hover { transform: translateY(-8px); }
.scene-img { position: relative; aspect-ratio: 16/10; }
.scene-img img { width: 100%; height: 100%; object-fit: cover; }
.ig-link {
  position: absolute;
  top: 16px; right: 16px;
  width: 40px; height: 40px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  color: var(--black);
  text-decoration: none;
  font-size: 20px;
  transition: all 0.2s;
}
.ig-link:hover { background: var(--orange); color: var(--white); }
.scene-body { padding: 24px; }
.scene-body h3 { font-size: 20px; font-weight: 900; margin-bottom: 4px; }
.scene-body .handle {
  font-size: 13px; font-weight: 700; color: var(--orange);
  text-decoration: none; display: block; margin-bottom: 12px;
}
.scene-body p { font-size: 14px; line-height: 1.6; color: var(--grey); }

/* --- D5 · Hood Section --- */
.hood-section {
  padding: 120px 24px;
  background-color: var(--cream);
}
.hood-container {
  max-width: 1100px; margin: 0 auto;
  display: grid; grid-template-columns: 1fr;
  gap: 80px; align-items: center;
}
@media (min-width: 900px) { .hood-container { grid-template-columns: 1fr 1.2fr; } }
.hood-content h2 {
  font-size: clamp(40px, 6vw, 64px);
  font-weight: 900; line-height: 1;
  margin-bottom: 24px;
}
.hood-content p {
  font-size: 16px; line-height: 1.7;
  color: var(--grey); margin-bottom: 32px;
}
.hood-quick {
  display: flex; flex-direction: column;
  gap: 14px;
  margin-bottom: 40px;
}
.q-item {
  font-size: 14px; font-weight: 800;
  display: flex; align-items: center; gap: 16px;
  padding: 10px 14px;
  border-radius: 8px;
  background: transparent;
  transition: background 0.2s;
}
.q-rank {
  font-family: 'Fraunces', serif;
  font-style: italic;
  font-size: 20px;
  color: var(--orange);
  flex-shrink: 0;
}
.q-name { color: var(--black); }
.q-name-link {
  color: var(--black);
  text-decoration: none;
  display: inline-flex; align-items: center; gap: 8px;
  transition: color 0.2s;
}
.q-name-link:hover { color: var(--orange); }
.q-ig { font-size: 13px; opacity: 0.7; }

/* Sponsored quick-list slot — gold inset card */
.q-item-sponsored {
  background: var(--warm-bg);
  border: 1.5px solid var(--orange);
  box-shadow: 0 6px 18px -8px rgba(255,140,66,0.25);
  padding: 14px 16px;
}
.q-item-sponsored .q-rank { color: var(--gold); }
.q-ad-label {
  margin-left: auto;
  font-size: 9px; font-weight: 900;
  color: var(--orange);
  text-transform: uppercase; letter-spacing: 0.15em;
  background: rgba(255,140,66,0.15);
  padding: 4px 8px; border-radius: 99px;
  white-space: nowrap;
}

.btn-dark {
  padding: 16px 32px;
  background: var(--black); color: var(--white);
  border: none; border-radius: 99px;
  font-size: 15px; font-weight: 800;
  cursor: pointer;
  transition: transform 0.2s;
}
.btn-dark:hover { transform: translateY(-2px); opacity: 0.9; }
.hood-visual { position: relative; aspect-ratio: 1; }
.hood-visual img {
  width: 100%; height: 100%;
  object-fit: cover; border-radius: 12px;
  box-shadow: 0 40px 80px -20px rgba(0,0,0,0.2);
}
.hood-visual .img-ph { border-radius: 12px; box-shadow: 0 40px 80px -20px rgba(0,0,0,0.2); }

/* --- Footer --- */
.explore-footer {
  padding: 140px 24px;
  text-align: center;
  background-color: var(--white);
}
.explore-footer h2 {
  font-size: clamp(32px, 6vw, 64px);
  font-weight: 900; margin-bottom: 24px;
}
.explore-footer p {
  font-size: 18px; color: var(--grey);
  margin-bottom: 40px;
}
.btn-primary {
  padding: 18px 48px;
  background: var(--orange); color: var(--white);
  border: none; border-radius: 99px;
  font-size: 18px; font-weight: 800;
  cursor: pointer;
  box-shadow: 0 20px 40px rgba(255, 140, 66, 0.3);
  transition: all 0.3s;
}
.btn-primary:hover {
  transform: translateY(-4px);
  box-shadow: 0 30px 60px rgba(255, 140, 66, 0.4);
}
.footer-meta {
  margin-top: 100px;
  padding-top: 40px;
  border-top: 1px solid var(--light-grey);
}
.footer-meta .logo { margin-bottom: 12px; display: inline-block; }
.footer-meta p { font-size: 12px; font-weight: 600; }

/* --- No-photo placeholder (used when a venue has no verified official image) --- */
.img-ph {
  width: 100%; height: 100%;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 8px;
  background: linear-gradient(135deg, #EEF2F7 0%, #F8FAFC 100%);
  border: 1px solid var(--light-grey);
}
.img-ph-letter {
  font-family: 'Fraunces', serif; font-style: italic;
  font-size: clamp(40px, 7vw, 72px); line-height: 1;
  color: #CBD5E1;
}
.img-ph-mark {
  font-size: 10px; font-weight: 800;
  letter-spacing: 0.22em; text-transform: uppercase;
  color: #94A3B8;
}
/* Dark variant for the black Top-10 section */
.img-ph-dark {
  background: linear-gradient(135deg, #1E293B 0%, #0F172A 100%);
  border-color: rgba(255, 255, 255, 0.08);
}
.img-ph-dark .img-ph-letter { color: rgba(255, 255, 255, 0.22); }
.img-ph-dark .img-ph-mark { color: rgba(255, 255, 255, 0.4); }

/* --- Reveal Animation --- */
.reveal {
  opacity: 0;
  transform: translateY(30px);
  transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}
.reveal.in { opacity: 1; transform: translateY(0); }
</style>
