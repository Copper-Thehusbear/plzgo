<script setup>
import { trackCTA } from '@/composables/useAnalytics'

const emit = defineEmits(['close'])

const BMC_URL = 'https://buymeacoffee.com/plzgo.me'
</script>

<template>
  <div
    class="fixed inset-0 z-[300] flex items-end justify-center p-4"
    style="background: rgba(28,39,61,0.6);"
    @click.self="emit('close')"
  >
    <div
      class="w-full max-w-sm p-6 mb-2 donation-card"
      style="background: var(--ink); border: 1px solid rgba(255,255,255,0.14); border-radius: 8px;"
    >
      <p class="data-mono text-[11px] uppercase mb-2" style="color: rgba(255,255,255,0.45)">Real talk</p>
      <h2 class="display-cond text-white mb-2" style="font-size: 26px; line-height: 1.2">
        This app runs on<br />coffee and vibes.
      </h2>
      <p class="text-[14px] font-normal mb-6 leading-relaxed" style="color: rgba(255,255,255,0.55)">
        If this route saved you 30 minutes of Googling,<br />maybe chip in <span class="data-mono">20 THB</span>?
      </p>

      <a
        :href="BMC_URL"
        target="_blank" rel="noopener noreferrer"
        @click="trackCTA('donation_bmc', 'Buy me a coffee', BMC_URL)"
        class="bmc-btn"
      >
        Buy me a coffee
      </a>

      <button
        @click="emit('close')"
        class="w-full py-3 text-[13px] font-normal"
        style="color: rgba(255,255,255,0.35); background: none; border: none; cursor: pointer;"
      >
        nah, I'm broke
      </button>
    </div>
  </div>
</template>

<style scoped>
/* A tiny bit of "receipt" here too — this literally is the coffee ask. */
.donation-card {
  transform: rotate(-1deg);
  box-shadow: var(--shadow-lift);
}
.bmc-btn {
  display: flex; align-items: center; justify-content: center;
  width: 100%; height: 52px;
  border-radius: 8px;
  font-size: 16px; font-weight: 700;
  margin-bottom: 12px;
  background: var(--signal);
  color: var(--ink);
  text-decoration: none;
  transition: transform 0.15s ease-out, box-shadow 0.15s ease-out;
}
.bmc-btn:hover  { transform: translateY(-2px); box-shadow: var(--shadow-md); }
.bmc-btn:active { transform: translateY(1px); box-shadow: none; }
</style>
