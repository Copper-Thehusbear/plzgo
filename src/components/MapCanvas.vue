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
const routeMarkers      = []
const routePolylines    = []
const contextualMarkers = []

// Transit Diagram line colors — must match --line-1/--line-2/--line-3 in style.css
const DAY_COLORS = ['#FF8C42', '#12796F', '#C2497D']

function dayColor(dayIdx) {
  return DAY_COLORS[dayIdx % DAY_COLORS.length]
}

function makeStationIcon(label, color) {
  // Transit station: white core, thick ring in the day's line color, mono stop number
  return L.divIcon({
    html: `<div class="plzgo-station" style="
      width:28px;height:28px;
      border:4px solid ${color};
      font-size:12px;
    ">${label}</div>`,
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -17],
  })
}

function makeGoldenIcon() {
  return L.divIcon({
    html: `<div class="plzgo-golden-pin">+</div>`,
    className: '',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -19],
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
      <p class="plzgo-popup-name" style="color:#B45309;">${name}</p>
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
  routePolylines.forEach(p => p.remove())
  routePolylines.length = 0

  const allCoords = []

  props.dayBlocks.forEach((block, dayIdx) => {
    const color = dayColor(dayIdx)
    const dayCoords = []

    block.forEach((place, i) => {
      const { latitude, longitude } = placeCoords(place)
      if (latitude == null || longitude == null) return
      allCoords.push([latitude, longitude])
      dayCoords.push([latitude, longitude])

      const marker = L.marker([latitude, longitude], { icon: makeStationIcon(i + 1, color) })
        .addTo(map)
        .bindPopup(
          L.popup({ className: 'plzgo-popup', maxWidth: 230, closeButton: false })
            .setContent(routePopupHtml(place))
        )

      routeMarkers.push(marker)
    })

    // Day line — same color as its station markers, draws itself on load
    if (dayCoords.length > 1) {
      const line = L.polyline(dayCoords, {
        color,
        weight: 4,
        opacity: 1,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map)

      line.getElement()?.classList.add('plzgo-route-draw')
      routePolylines.push(line)
    }
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
