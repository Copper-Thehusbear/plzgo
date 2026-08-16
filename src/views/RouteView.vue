<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { db } from '@/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { buildOptimalDays } from '@/composables/useRouting'
import MapCanvas from '@/components/MapCanvas.vue'
import TimelineItem from '@/components/TimelineItem.vue'
import AppLayout from '@/components/AppLayout.vue'

const route  = useRoute()
const router = useRouter()

const loading   = ref(true)
const notFound  = ref(false)
const dayBlocks = ref([])
const meta      = ref({})
const dayLabels = ['Day 1', 'Day 2', 'Day 3']
// Line colors — must match MapCanvas DAY_COLORS and --line-1/2/3 in style.css
const DAY_COLORS = ['var(--line-1)', 'var(--line-2)', 'var(--line-3)']

onMounted(async () => {
  try {
    const snap = await getDoc(doc(db, 'routes', route.params.id))
    if (!snap.exists()) { notFound.value = true; loading.value = false; return }
    const data  = snap.data()
    meta.value  = { city: data.city, vibe: data.vibe, days: data.days }
    dayBlocks.value = buildOptimalDays(data.places).days
    document.title  = `${data.city} route · plzgo`
  } catch {
    notFound.value = true
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <AppLayout>
    <template #header>
      <nav class="glass-nav h-16 w-full">
        <div class="max-w-7xl mx-auto h-full px-4 md:px-6 lg:px-8 flex items-center justify-between">
          <span class="rv-wordmark">plz<span style="color:var(--line-1)">go</span></span>
          <button class="m-back-btn" @click="router.push('/plan')">
            Plan yours
            <i class="fa-solid fa-arrow-right ml-1.5" style="font-size:11px"></i>
          </button>
        </div>
      </nav>
    </template>

    <div class="flex-1 flex flex-col pt-16"> <!-- Compensate for fixed header -->
      <!-- Map slab -->
      <div class="h-[42vh] flex-shrink-0 relative overflow-hidden" style="background:var(--paper)">
        <MapCanvas
          v-if="!loading && dayBlocks.length"
          :dayBlocks="dayBlocks"
          :contextualPins="[]"
        />
        <!-- Map skeleton while loading -->
        <div v-else class="rw-map-skeleton">
          <div class="rw-spinner" />
        </div>

        <!-- Line badges -->
        <div
          v-if="!loading && meta.days > 1"
          style="position:absolute;top:10px;left:10px;z-index:1000;display:flex;gap:6px;"
        >
          <span
            v-for="(label, i) in dayLabels.slice(0, meta.days)"
            :key="i"
            class="rw-line-badge data-mono"
            :style="{ background: DAY_COLORS[i] }"
          >● {{ label }}</span>
        </div>
      </div>

      <!-- Paper panel -->
      <div class="flex-1 overflow-y-auto hide-scrollbar rw-panel">
        <div style="padding:20px 18px 48px;">

          <!-- Loading skeletons -->
          <div v-if="loading" style="display:flex;flex-direction:column;gap:12px;margin-top:8px;">
            <div class="rw-skel" style="height:28px;width:40%;" />
            <div class="rw-skel" style="height:40px;width:70%;" />
            <div class="rw-skel" style="height:80px;" />
            <div class="rw-skel" style="height:80px;" />
          </div>

          <!-- Not found -->
          <div
            v-else-if="notFound"
            style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:48px 0;text-align:center;"
          >
            <p class="display-cond" style="font-size:28px;color:var(--ink);margin:0 0 8px;">Route not found.</p>
            <p style="font-size:14px;color:var(--muted);margin:0 0 32px;">Link might be expired or broken.</p>
            <button
              @click="router.push('/plan')"
              style="font-size:14px;font-weight:700;color:var(--orange-text);background:none;border:none;cursor:pointer;"
            >Plan your own →</button>
          </div>

          <!-- Route content -->
          <template v-else>

            <!-- Header -->
            <div style="margin-bottom:24px;margin-top:4px;">
              <p class="data-mono rw-eyebrow">Shared route</p>
              <h1 class="display-cond" style="font-size:28px;color:var(--ink);line-height:1.1;margin:0 0 4px;">
                {{ meta.city }}
              </h1>
              <p style="font-size:13px;color:var(--muted);margin:0;">
                <span class="data-mono">{{ meta.days }}-day</span> · {{ meta.vibe }}
              </p>
            </div>

            <!-- Day blocks -->
            <div
              v-for="(block, dayIndex) in dayBlocks"
              :key="dayIndex"
              style="margin-bottom:20px;"
              :style="{ '--row-line': DAY_COLORS[dayIndex] }"
            >
              <p
                v-if="meta.days > 1"
                class="rw-line-badge data-mono"
                style="display:inline-block;margin-bottom:10px;"
                :style="{ background: DAY_COLORS[dayIndex] }"
              >● Line {{ dayIndex + 1 }} · {{ dayLabels[dayIndex] }}</p>

              <div class="rw-day-card">
                <TimelineItem
                  v-for="(place, i) in block"
                  :key="place.id"
                  :place="place"
                  :index="i"
                  theme="light"
                />
              </div>
            </div>

            <!-- CTA — the ONE orange element on this screen -->
            <div style="margin-top:24px;">
              <button class="btn-ios rw-cta" @click="router.push('/plan')">
                Build my own route →
              </button>
            </div>

          </template>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<style scoped>
@keyframes spin {
  to { transform: rotate(360deg); }
}

.rv-wordmark {
  font-family: 'IBM Plex Sans Condensed', 'IBM Plex Sans Thai', sans-serif;
  font-size: 19px;
  font-weight: 700;
  color: var(--ink);
}

.rw-panel {
  background: var(--paper);
  border-top: 1px solid var(--hairline);
  position: relative;
  z-index: 10;
}

.rw-map-skeleton {
  width: 100%; height: 100%;
  background: var(--paper);
  display: flex; align-items: center; justify-content: center;
}
.rw-spinner {
  width: 32px; height: 32px;
  border-radius: 50%;
  border: 3px solid var(--hairline);
  border-top-color: var(--ink);
  animation: spin 0.8s linear infinite;
}

.rw-skel {
  border-radius: 8px;
  background: var(--hairline);
  opacity: 0.5;
  animation: pulse 1.5s ease infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 0.5; }
  50%      { opacity: 0.25; }
}

.rw-eyebrow {
  font-size: 10px;
  text-transform: uppercase;
  color: var(--orange-text);
  margin: 0 0 6px;
}

.rw-line-badge {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 10.5px;
  text-transform: uppercase;
  color: #fff;
}

.rw-day-card {
  border-radius: 8px;
  padding: 0 14px 4px;
  background: #fff;
  border: 1px solid var(--hairline);
  box-shadow: var(--shadow-sm);
}

.rw-cta {
  width: 100%;
  height: 52px;
  border-radius: 8px;
  font-size: 15px;
}
</style>
