<script setup>
const emit = defineEmits(['close'])
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-end justify-center p-4"
    style="background: rgba(0,0,0,0.7); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);"
    @click.self="emit('close')"
  >
    <div
      class="w-full max-w-sm rounded-3xl p-6 border mb-2"
      style="background: #0F1C35; border-color: rgba(255,255,255,0.1); box-shadow: 0 -8px 32px rgba(0,0,0,0.5);"
    >
      <p class="text-[11px] font-semibold uppercase tracking-widest mb-2"
         style="color: rgba(255,255,255,0.3)">Real talk</p>
      <h2 class="font-bold text-white mb-2" style="font-size: 26px; letter-spacing: -0.02em; line-height: 1.2">
        This app runs on<br />coffee and vibes.
      </h2>
      <p class="text-[14px] font-normal mb-6 leading-relaxed"
         style="color: rgba(255,255,255,0.4)">
        If this route saved you 30 minutes of Googling,<br />maybe chip in 20 THB?
      </p>

      <a
        href="https://www.buymeacoffee.com"
        target="_blank" rel="noopener"
        class="flex items-center justify-center w-full h-[52px] rounded-full text-[16px] font-bold mb-3 active:scale-[0.96] transition-all"
        style="background: #F4A261; color: #1B2B4B; letter-spacing: -0.01em; box-shadow: 0 4px 20px rgba(244,162,97,0.35);"
      >
        Buy me a coffee
      </a>

      <button
        @click="emit('close')"
        class="w-full py-3 text-[13px] font-normal active:opacity-60 transition-opacity"
        style="color: rgba(255,255,255,0.25)"
      >
        nah, I'm broke
      </button>
    </div>
  </div>
</template>
