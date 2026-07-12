<script setup>
import { RouterView } from 'vue-router'
</script>

<template>
  <RouterView v-slot="{ Component }">
    <Transition name="slide-up" mode="out-in">
      <component :is="Component" />
    </Transition>
  </RouterView>
</template>
