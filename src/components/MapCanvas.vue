<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useTripStore } from '@/stores/useTripStore'

const props = defineProps({
  dayBlocks:       { type: Array, required: true },
  contextualPins:  { type: Array, default: () => [] }, // [{ place, walkMinutes, nearestName }]
})

const emit = defineEmits(['pin-click'])

const store = useTripStore()

const mapEl = ref(null)
let map = null
const routeMarkers     = []
const contextualMarkers = []

const DAY_COLORS = ['#FF8C42', '#3B82F6', '#0D9488']

function makeRouteIcon(label, color) {
  return L.divIcon({
    html: `<div style="
      width:30px;height:30px;border-radius:50%;
      background:${color};border:2.5px solid #fff;
      display:flex;align-items:center;justify-content:center;
      font-family:Inter,sans-serif;font-size:12px;font-weight:700;color:#fff;
      box-shadow:0 2px 10px rgba(0,0,0,0.3);
    ">${label}</div>`,
    className: '',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -18],
  })
}

function makeGoldenIcon() {
  return L.divIcon({
    html: `<div class="plzgo-golden-pin">✦</div>`,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -20],
  })
}

function placeCoords(place) {
  return {
    latitude:  place.location?.latitude  ?? place.latitude,
    longitude: place.location?.longitude ?? place.longitude,
  }
}

function mapsUrl(place) {
  const { latitude, longitude } = placeCoords(place)
  const name = encodeURIComponent(place.name_en || place.name)
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}&query_place_id=${name}`
}

function routePopupHtml(place) {
  const name = store.lang === 'th' ? place.name : (place.name_en || place.name)
  const descRaw = store.lang === 'th' ? (place.description || place.description_tourist) : place.description_tourist
  const desc = (descRaw || '').slice(0, 90)
  const trail = (descRaw || '').length > 90 ? '…' : ''
  const url = mapsUrl(place)
  return `
    <div class="plzgo-popup-inner">
      <p class="plzgo-popup-name">${name}</p>
      ${desc ? `<p class="plzgo-popup-desc">${desc}${trail}</p>` : ''}
      <a href="${url}" target="_blank" rel="noopener" class="plzgo-popup-cta">
        Navigate Here →
      </a>
    </div>
  `
}

function goldenPopupHtml(entry) {
  const name = store.lang === 'th' ? entry.place.name : (entry.place.name_en || entry.place.name)
  const hook = store.lang === 'th'
    ? `เดินประมาณ ${entry.walkMinutes} นาที${entry.nearestName ? ` จาก ${entry.nearestName}` : ''}`
    : `~${entry.walkMinutes} min walk${entry.nearestName ? ` from ${entry.nearestName}` : ''}`
  return `
    <div class="plzgo-popup-inner">
      <p class="plzgo-popup-name" style="color:#B45309;">✦ ${name}</p>
      <p class="plzgo-popup-desc">${hook}</p>
      <button class="plzgo-popup-cta plzgo-golden-cta" data-pin-id="${entry.place.id}">
        ${store.lang === 'th' ? 'ดูรายละเอียด →' : 'See full details →'}
      </button>
    </div>
  `
}

function renderRouteMarkers() {
  routeMarkers.forEach(m => m.remove())
  routeMarkers.length = 0

  const allCoords = []

  props.dayBlocks.forEach((block, dayIdx) => {
    const color = DAY_COLORS[dayIdx] ?? DAY_COLORS[0]
    block.forEach((place, i) => {
      const { latitude, longitude } = placeCoords(place)
      if (latitude == null || longitude == null) return
      allCoords.push([latitude, longitude])

      const marker = L.marker([latitude, longitude], { icon: makeRouteIcon(i + 1, color) })
        .addTo(map)
        .bindPopup(
          L.popup({ className: 'plzgo-popup', maxWidth: 230, closeButton: false })
            .setContent(routePopupHtml(place))
        )

      routeMarkers.push(marker)
    })
  })

  if (allCoords.length === 1) {
    map.setView(allCoords[0], 15)
  } else if (allCoords.length > 1) {
    map.fitBounds(L.latLngBounds(allCoords), { padding: [48, 48], maxZoom: 15 })
  }
}

function renderContextualMarkers() {
  contextualMarkers.forEach(m => m.remove())
  contextualMarkers.length = 0

  props.contextualPins.forEach(entry => {
    const { latitude, longitude } = placeCoords(entry.place)
    if (latitude == null || longitude == null) return

    const popup = L.popup({ className: 'plzgo-popup', maxWidth: 230, closeButton: false })
      .setContent(goldenPopupHtml(entry))

    const marker = L.marker([latitude, longitude], { icon: makeGoldenIcon(), zIndexOffset: 100 })
      .addTo(map)
      .bindPopup(popup)

    // Listen for the "See full details" button inside popup
    popup.on('add', () => {
      const btn = popup.getElement()?.querySelector('.plzgo-golden-cta')
      if (btn) {
        btn.addEventListener('click', () => {
          map.closePopup()
          emit('pin-click', entry)
        })
      }
    })

    contextualMarkers.push(marker)
  })
}

onMounted(() => {
  const allPlaces = props.dayBlocks.flat()
  const lat = allPlaces.length
    ? allPlaces.reduce((s, p) => s + (placeCoords(p).latitude ?? 0), 0) / allPlaces.length
    : 13.7563
  const lng = allPlaces.length
    ? allPlaces.reduce((s, p) => s + (placeCoords(p).longitude ?? 0), 0) / allPlaces.length
    : 100.5018

  map = L.map(mapEl.value, {
    center: [lat, lng],
    zoom: 13,
    zoomControl: false,
    attributionControl: false,
  })

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    subdomains: 'abcd',
    maxZoom: 19,
  }).addTo(map)

  renderRouteMarkers()
  renderContextualMarkers()
})

watch(() => props.dayBlocks, renderRouteMarkers, { deep: true })
watch(() => props.contextualPins, renderContextualMarkers, { deep: true })

onUnmounted(() => {
  if (map) { map.remove(); map = null }
})
</script>

<template>
  <div ref="mapEl" style="width: 100%; height: 100%;" />
</template>
