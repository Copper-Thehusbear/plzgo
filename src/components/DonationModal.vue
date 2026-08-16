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
      <h2 class="display-cond text-white mb-3" style="font-size: 28px; line-height: 1.12">
        No ads. No sign-up.<br />No data resold.
      </h2>
      <p class="text-[14px] font-normal mb-5 leading-relaxed" style="color: rgba(255,255,255,0.58)">
        Every place here was checked by hand — not scraped, not guessed by
        a chatbot. <span class="data-mono" style="color:#fff">฿20</span> keeps it that way for
        whoever plans their trip next.
      </p>

      <ul class="dm-list">
        <li>Keeps the map free and ad-free</li>
        <li>Pays for new places each month</li>
        <li>Roughly one iced coffee. In Bangkok.</li>
      </ul>

      <a
        :href="BMC_URL"
        target="_blank" rel="noopener noreferrer"
        @click="trackCTA('donation_bmc', 'Buy me a coffee', BMC_URL)"
        class="bmc-btn"
      >
        Chip in ฿20
      </a>

      <button
        @click="emit('close')"
        class="w-full py-3 text-[13px] font-normal dm-dismiss"
      >
        Maybe next trip
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
/* What the money actually buys — concrete beats sentimental */
.dm-list {
  list-style: none;
  margin: 0 0 22px;
  padding: 0;
}
.dm-list li {
  display: flex;
  align-items: baseline;
  gap: 9px;
  font-size: 13px;
  line-height: 1.5;
  padding: 6px 0;
  color: rgba(255,255,255,0.72);
}
.dm-list li::before {
  content: '→';
  color: var(--signal);
  flex: none;
}
/* An easy, unembarrassing way out — a guilt-trip costs more than it earns */
.dm-dismiss {
  color: rgba(255,255,255,0.4);
  background: none;
  border: none;
  cursor: pointer;
  transition: color 0.15s;
}
.dm-dismiss:hover { color: rgba(255,255,255,0.7); }

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
