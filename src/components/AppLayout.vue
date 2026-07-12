<template>
  <div class="app-layout-root">
    <header class="app-header">
      <slot name="header"></slot>
    </header>

    <main class="app-main">
      <slot></slot>
    </main>

    <footer class="app-footer tab-bar glass-panel shadow-2xl">
      <router-link to="/plan" class="nav-icon" active-class="active">
        <i class="fa-solid fa-house"></i>
      </router-link>
      <router-link to="/swipe" class="nav-icon" active-class="active">
        <i class="fa-solid fa-layer-group"></i>
      </router-link>
      <router-link to="/route" class="nav-icon" active-class="active">
        <i class="fa-solid fa-map"></i>
      </router-link>
    </footer>
  </div>
</template>

<style scoped>
.app-layout-root {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
  padding-bottom: max(env(safe-area-inset-bottom), 80px);
}

.app-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  padding-top: max(env(safe-area-inset-top), 0px);
  background: transparent;
}

.app-main {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.app-footer {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  padding: 8px;
  display: flex;
  gap: 8px;
  z-index: 100;
}

.nav-icon {
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  transition: all 0.3s;
  color: var(--navy);
  opacity: 0.6;
  text-decoration: none;
}
.nav-icon.active {
  background: var(--navy);
  color: white;
  opacity: 1;
}
</style>
