import { useDistance } from './useDistance'

const ZONE_HUBS = [
  { name: 'Sukhumvit',       lat: 13.7305, lng: 100.5700,
    copy: 'Your picks are scattered along the BTS line. Sukhumvit puts you on the train to everywhere — rooftop bars are right downstairs.' },
  { name: 'Silom / Sathorn', lat: 13.7260, lng: 100.5290,
    copy: 'Business district by day, Patpong chaos by night. Dead-center for everything you chose.' },
  { name: 'Old City',        lat: 13.7500, lng: 100.4913,
    copy: 'You went full culture mode. Stay here and wake up to temple bells instead of Grab horns.' },
  { name: 'Thonglor',        lat: 13.7270, lng: 100.5617,
    copy: 'Hip cafés, Japanese food, and Bangkok\'s best rooftop bars. Your people live here.' },
  { name: 'Yaowarat',        lat: 13.7399, lng: 100.5100,
    copy: 'Chinatown never sleeps, and neither will you. The best late-night food in the city is literally your lobby view.' },
  { name: 'Chatuchak',       lat: 13.8000, lng: 100.5500,
    copy: 'Weekend market energy all week. Great BTS/MRT links to everywhere you\'re going.' },
  { name: 'Ari',             lat: 13.7740, lng: 100.5440,
    copy: 'The calm, local neighbourhood where actual Bangkokians live. Low tourist density, dangerously high café count.' },
  { name: 'Riverside',       lat: 13.7262, lng: 100.5091,
    copy: 'The Chao Phraya as your backdrop. Boats, history, and sunset views — this is the romantic option.' },
]

export function findNearestZone(swipedPlaces) {
  const { haversine } = useDistance()
  const coord = p => ({ lat: p.location?.latitude ?? p.latitude, lng: p.location?.longitude ?? p.longitude })
  const valid = swipedPlaces.filter(p => coord(p).lat)
  if (!valid.length) return null

  const lat = valid.reduce((s, p) => s + coord(p).lat, 0) / valid.length
  const lng = valid.reduce((s, p) => s + coord(p).lng, 0) / valid.length

  let nearest = ZONE_HUBS[0]
  let nearestDist = Infinity
  for (const hub of ZONE_HUBS) {
    const d = haversine(lat, lng, hub.lat, hub.lng)
    if (d < nearestDist) { nearestDist = d; nearest = hub }
  }

  return { name: nearest.name, copy: nearest.copy, lat: nearest.lat, lng: nearest.lng }
}
