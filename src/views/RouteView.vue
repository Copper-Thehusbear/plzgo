<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { db } from '@/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { buildOptimalDays } from '@/composables/useRouting'
// import NavBar from '@/components/NavBar.vue' // REMOVE
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
const DAY_COLORS = ['var(--orange)', '#3B82F6', '#0D9488']

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
          <span class="rv-wordmark">plz<span style="color:var(--orange)">go</span></span>
          <button class="m-back-btn" @click="router.push('/plan')">
            Plan yours
            <i class="fa-solid fa-arrow-right ml-1.5" style="font-size:11px"></i>
          </button>
        </div>
      </nav>
    </template>

    <!-- Main Content for RouteView -->
    <div class="flex-1 flex flex-col pt-16"> <!-- Compensate for fixed header -->
      <!-- Map slab -->
      <div class="h-[42vh] flex-shrink-0 relative overflow-hidden bg-slate-200">
        <MapCanvas
          v-if="!loading && dayBlocks.length"
          :dayBlocks="dayBlocks"
          :contextualPins="[]"
        />
        <!-- Map skeleton while loading -->
        <div
          v-else
          style="width:100%;height:100%;background:linear-gradient(135deg,#E2E8F0 0%,#CBD5E1 100%);
                 display:flex;align-items:center;justify-content:center;"
        >
          <div style="width:32px;height:32px;border-radius:50%;border:3px solid #94A3B8;border-top-color:transparent;animation:spin 0.8s linear infinite;" />
        </div>

        <!-- Day legend chips -->
        <div
          v-if="!loading && meta.days > 1"
          style="position:absolute;top:10px;left:10px;z-index:1000;display:flex;gap:6px;"
        >
          <span
            v-for="(label, i) in dayLabels.slice(0, meta.days)"
            :key="i"
            style="padding:4px 10px;border-radius:999px;font-size:11px;font-weight:700;color:#fff;backdrop-filter:blur(8px);"
            :style="{ background: DAY_COLORS[i] }"
          >{{ label }}</span>
        </div>
      </div>

      <!-- Cream panel -->
      <div
        class="flex-1 overflow-y-auto hide-scrollbar"
        style="
          background:#FDFCF8;
          border-radius:20px 20px 0 0;
          margin-top:-20px;
          position:relative;
          z-index:10;
          box-shadow:0 -4px 24px rgba(30,41,59,0.10);
        "
      >
        <!-- Drag handle -->
        <div style="display:flex;justify-content:center;padding:12px 0 4px;">
          <div style="width:36px;height:4px;border-radius:2px;background:rgba(30,41,59,0.12);" />
        </div>

        <div style="padding:8px 18px 48px;">

          <!-- Loading skeletons -->
          <div v-if="loading" style="display:flex;flex-direction:column;gap:12px;margin-top:8px;">
            <div style="height:28px;width:40%;border-radius:8px;background:rgba(30,41,59,0.06);animation:pulse 1.5s ease infinite;" />
            <div style="height:40px;width:70%;border-radius:8px;background:rgba(30,41,59,0.06);animation:pulse 1.5s ease infinite;" />
            <div style="height:80px;border-radius:16px;background:rgba(30,41,59,0.06);animation:pulse 1.5s ease infinite;" />
            <div style="height:80px;border-radius:16px;background:rgba(30,41,59,0.06);animation:pulse 1.5s ease infinite;" />
          </div>

          <!-- Not found -->
          <div
            v-else-if="notFound"
            style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:48px 0;text-align:center;"
          >
            <p style="font-size:28px;font-weight:900;color:#1E293B;letter-spacing:-0.03em;margin:0 0 8px;">Route not found.</p>
            <p style="font-size:14px;color:#94A3B8;margin:0 0 32px;">Link might be expired or broken.</p>
            <button
              @click="router.push('/plan')"
              style="font-size:14px;font-weight:600;color:#FF8C42;background:none;border:none;cursor:pointer;"
            >Plan your own →</button>
          </div>

          <!-- Route content -->
          <template v-else>

            <!-- Header -->
            <div style="margin-bottom:24px;margin-top:4px;">
              <p style="font-size:10px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#FF8C42;margin:0 0 6px;">
                Shared route
              </p>
              <h1 style="font-size:28px;font-weight:900;color:#1E293B;letter-spacing:-0.03em;line-height:1.1;margin:0 0 4px;">
                {{ meta.city }}
              </h1>
              <p style="font-size:13px;color:#94A3B8;font-weight:400;margin:0;">
                {{ meta.days }}-day · {{ meta.vibe }}
              </p>
            </div>

            <!-- Day blocks -->
            <div
              v-for="(block, dayIndex) in dayBlocks"
              :key="dayIndex"
              style="margin-bottom:20px;"
            >
              <p
                v-if="meta.days > 1"
                style="font-size:10px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#94A3B8;margin-bottom:10px;"
              >{{ dayLabels[dayIndex] }}</p>

              <div
                style="
                  border-radius:20px;padding:0 14px;
                  background:#fff;
                  border:1px solid rgba(30,41,59,0.08);
                  box-shadow:0 1px 8px rgba(30,41,59,0.05);
                "
              >
                <TimelineItem
                  v-for="(place, i) in block"
                  :key="place.id"
                  :place="place"
                  :index="i"
                />
              </div>
            </div>

            <!-- CTA -->
            <div style="margin-top:24px;">
              <button
                @click="router.push('/plan')"
                style="
                  width:100%;height:52px;border-radius:999px;
                  font-size:15px;font-weight:700;
                  background:#FF8C42;color:#fff;
                  border:none;cursor:pointer;
                  box-shadow:0 4px 16px rgba(255,140,66,0.3);
                "
              >Plan your own trip →</button>
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
/* Removed root div styles as AppLayout now manages them */
/* .flex { display: flex; } */
/* .flex-col { flex-direction: column; } */
/* .h-100dvh { height: 100dvh; } */
/* .bg-\[\#FDFCF8\] { background: #FDFCF8; } */

/* Specific wordmark for RouteView header if different from global */
.rv-wordmark {
  font-size: 19px;
  font-weight: 900;
  letter-spacing: -0.02em;
  color: var(--navy);
}
/* No need for fixed positioning here as AppLayout handles it */
/* .nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  height: 56px;
  padding-top: max(env(safe-area-inset-top), 0px);
} */
</style>