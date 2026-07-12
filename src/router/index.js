import { createRouter, createWebHistory } from 'vue-router'
import { useTripStore } from '@/stores/useTripStore'

const routes = [
  {
    path: '/',
    name: 'Landing',
    component: () => import('@/views/LandingView.vue'),
    meta: {
      title: 'plzgo — Swipe. Match. Go. Your Bangkok trip, planned in minutes',
      description: 'Tinder-style Bangkok trip planner. Swipe on places you like, get an optimized day-by-day route on a map. Free, no signup.'
    }
  },
  {
    path: '/explore',
    name: 'Explore',
    component: () => import('@/views/ExploreView.vue'),
    meta: {
      title: 'Explore Bangkok — this month\'s hit list · plzgo',
      description: 'The monthly plzgo issue: new bars, concerts on sale, where to sleep, and the neighborhood worth your time this month in Bangkok.'
    }
  },
  {
    path: '/privacy',
    name: 'Privacy',
    component: () => import('@/views/PrivacyView.vue'),
    meta: { title: 'Privacy Policy · plzgo' }
  },
  {
    path: '/terms',
    name: 'Terms',
    component: () => import('@/views/TermsView.vue'),
    meta: { title: 'Terms of Service · plzgo' }
  },
  {
    path: '/plan',
    name: 'Home',
    component: () => import('@/views/HomeView.vue'),
    meta: {
      title: 'Plan your Bangkok trip — pick your vibe · plzgo',
      description: 'Pick your travel vibe and trip length, swipe on real Bangkok places, and get a route a local would actually walk.'
    }
  },
  {
    path: '/swipe',
    name: 'Swipe',
    component: () => import('@/views/SwipeView.vue'),
    meta: { title: 'Swiping Bangkok spots… · plzgo' },
    beforeEnter: () => {
      const store = useTripStore()
      if (!store.selectedCity || !store.selectedVibes.length) {
        return { name: 'Home' }
      }
    }
  },
  {
    path: '/route/:id',
    name: 'SharedRoute',
    component: () => import('@/views/RouteView.vue'),
  },
  {
    path: '/route',
    name: 'Route',
    component: () => import('@/views/ResultView.vue'),
    beforeEnter: () => {
      const store = useTripStore()
      if (!store.swipedPlaces.length) {
        return { name: 'Home' }
      }
    }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Per-route <title> + meta description. ResultView/RouteView set their own
// richer titles on mount (route names, day counts) — meta.title here is the
// fallback for routes that don't.
const DEFAULT_TITLE = 'plzgo — Your Bangkok trip, planned in minutes'
router.afterEach((to) => {
  document.title = to.meta.title || DEFAULT_TITLE
  if (to.meta.description) {
    let tag = document.querySelector('meta[name="description"]')
    if (!tag) {
      tag = document.createElement('meta')
      tag.setAttribute('name', 'description')
      document.head.appendChild(tag)
    }
    tag.setAttribute('content', to.meta.description)
  }
})

export default router
