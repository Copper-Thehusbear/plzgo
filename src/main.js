import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './style.css'

const app = createApp(App)

// Last-resort net so a component error doesn't white-screen the whole app
// silently — surfaces in the console (and whatever error tracking is wired
// to console/window later) instead of just vanishing.
app.config.errorHandler = (err, instance, info) => {
  console.error('[plzgo] Unhandled Vue error:', err, info)
}
window.addEventListener('unhandledrejection', (event) => {
  console.error('[plzgo] Unhandled promise rejection:', event.reason)
})

app.use(createPinia())
app.use(router)
app.mount('#app')
