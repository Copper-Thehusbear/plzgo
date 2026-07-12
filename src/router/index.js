import { createRouter, createWebHistory } from 'vue-router'
import { useTripStore } from '@/stores/useTripStore'

const routes = [
  {
    path: '/',
    name: 'Landing',
    component: () => import('@/views/LandingView.vue')
  },
  {
    path: '/explore',
    name: 'Explore',
    component: () => import('@/views/ExploreView.vue')
  },
  {
    path: '/privacy',
    name: 'Privacy',
    component: () => import('@/views/PrivacyView.vue')
  },
  {
    path: '/terms',
    name: 'Terms',
    component: () => import('@/views/TermsView.vue')
  },
  {
    path: '/plan',
    name: 'Home',
    component: () => import('@/views/HomeView.vue')
  },
  {
    path: '/swipe',
    name: 'Swipe',
    component: () => import('@/views/SwipeView.vue'),
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

export default router
