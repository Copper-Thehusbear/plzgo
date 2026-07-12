<script setup>
import { RouterView } from 'vue-router'
</script>

<template>
  <div class="liquid-bg" />
  <div class="liquid-blob" />
  <div class="bg-depth" />
  <RouterView v-slot="{ Component }">
    <Transition name="slide-up" mode="out-in">
      <component :is="Component" />
    </Transition>
  </RouterView>
</template>
