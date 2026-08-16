<script setup>
import { useRouter } from 'vue-router'
import { useTripStore } from '@/stores/useTripStore'

const router = useRouter()
const store = useTripStore()

function restart() {
  store.reset()
  router.push('/plan')
}
</script>

<template>
  <nav
    class="glass-nav fixed top-0 left-0 right-0 w-full z-50 h-14 flex items-center justify-between px-4 md:px-6 lg:px-8"
    style="padding-top: max(env(safe-area-inset-top), 0px);"
  >
    <span
      class="text-2xl font-black tracking-tight cursor-pointer"
      style="color: var(--navy);"
      @click="router.push('/')"
    >
      plz<span style="color: var(--orange);">go</span>
    </span>

    <div class="flex items-center gap-2">
      <button
        @click="store.toggleLang"
        class="nb-chip h-[30px] px-3 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center transition-all"
        style="background: rgba(30,41,59,0.06); border: 1px solid rgba(30,41,59,0.1);"
        :style="{ color: store.lang === 'th' ? 'var(--orange)' : 'rgba(30,41,59,0.5)' }"
      >
        {{ store.lang === 'th' ? 'TH' : 'EN' }}
      </button>

      <button
        @click="restart"
        class="nb-chip h-[30px] px-3.5 rounded-full text-xs font-semibold flex items-center active:scale-95 transition-transform"
        style="color: rgba(30,41,59,0.5); background: rgba(30,41,59,0.06); border: 1px solid rgba(30,41,59,0.1);"
      >Start over</button>
    </div>
  </nav>
</template>

<style scoped>
.nb-chip { transition: transform 0.15s ease-out, box-shadow 0.15s ease-out; }
.nb-chip:hover { transform: translateY(-2px); box-shadow: var(--shadow-sm); }
</style>
