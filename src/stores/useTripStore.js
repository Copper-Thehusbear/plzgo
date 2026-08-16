import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const MODE_CONFIG = {
  chill: {
    cardLimit: 20,
    yepCap: 5,
    universalOnly: true,
    excludeTypes: ['hotel', 'shopping', 'area'],
    maxDuration: 90,
    suggestedDays: 1,
  },
  full: {
    cardLimit: 40,
    yepCap: 12,
    universalOnly: false,
    excludeTypes: [],
    maxDuration: null,
    suggestedDays: 3,
  },
  tour: {
    cardLimit: 15,
    yepCap: 6,
    universalOnly: true,
    excludeTypes: ['hotel', 'shopping', 'area', 'nightlife'],
    maxDuration: 60,
    suggestedDays: 1,
  },
}

export const useTripStore = defineStore('trip', () => {
  const selectedCity  = ref(null)
  const selectedVibes = ref([])   // array of up to 3 vibe IDs
  const selectedDays  = ref(1)
  const swipedPlaces  = ref([])
  const cardPool      = ref([])
  const tripMode      = ref('chill')
  const openNow       = ref(false)
  const gayFilterOn   = ref(false)
  const localModeOn   = ref(false)

  // App is English-only; ignore stale localStorage 'th' setting
  localStorage.removeItem('plzgo_lang')
  const lang = ref('en')
  function toggleLang() {
    lang.value = lang.value === 'en' ? 'th' : 'en'
  }

  const modeConfig = computed(() => MODE_CONFIG[tripMode.value])
  const isFull     = computed(() => swipedPlaces.value.length >= modeConfig.value.yepCap)

  function setCity(city)        { selectedCity.value = city }
  function setVibes(vibes)      { selectedVibes.value = vibes }
  function setDays(days)        { selectedDays.value = days }
  function setCardPool(places)  { cardPool.value = places }

  function swipeYep(place) {
    if (isFull.value) return false
    if (swipedPlaces.value.some(p => p.id === place.id)) return false // already swiped, ignore
    swipedPlaces.value.push(place)
    return true
  }

  function reset() {
    selectedCity.value  = null
    selectedVibes.value = []
    selectedDays.value  = 1
    swipedPlaces.value  = []
    cardPool.value      = []
    openNow.value       = false
    gayFilterOn.value   = false
    localModeOn.value   = false
  }

  return {
    selectedCity,
    selectedVibes,
    selectedDays,
    swipedPlaces,
    cardPool,
    tripMode,
    modeConfig,
    isFull,
    openNow,
    gayFilterOn,
    localModeOn,
    lang,
    setCity,
    setVibes,
    setDays,
    setCardPool,
    swipeYep,
    reset,
    toggleLang,
  }
})
