const WEATHER_URL =
  'https://api.open-meteo.com/v1/forecast?latitude=13.7563&longitude=100.5018&hourly=precipitation_probability,weathercode,temperature_2m&forecast_days=1&timezone=Asia%2FBangkok'

const CACHE_MS = 30 * 60 * 1000

let _cache = null

function labelFromCode(code) {
  if (code === 0) return 'Clear'
  if (code <= 3) return 'Partly Cloudy'
  if (code <= 48) return 'Foggy'
  if (code <= 55) return 'Light Drizzle'
  if (code <= 65) return code <= 63 ? 'Light Rain' : 'Heavy Rain'
  if (code <= 82) return 'Rain Showers'
  if (code >= 95) return 'Thunderstorm'
  return 'Cloudy'
}

function tipFromCode(code, precipProb) {
  if (precipProb >= 80) return 'Stay inside — Bangkok floods fast'
  if (precipProb >= 60) return 'Grab it — outdoor spots are risky today'
  if (code === 0) return 'Perfect for temples & street walks'
  if (code <= 2) return 'Great light for photography today'
  if (code <= 3) return 'Outdoor markets will be buzzing'
  if (code <= 48) return 'Hazy vibes — classic Bangkok morning'
  if (code <= 55) return 'Light drizzle — grab coffee, wait it out'
  if (code <= 65) return 'Mall day — MBK or IconSiam'
  if (code <= 82) return 'Heavy showers — indoor gems only'
  if (code >= 95) return 'Bangkok storm in play — stay put'
  return 'Check conditions before heading out'
}

function iconFromCode(code) {
  if (code === 0) return 'fa-sun'
  if (code <= 2) return 'fa-cloud-sun'
  if (code <= 3) return 'fa-cloud'
  if (code <= 48) return 'fa-smog'
  if (code <= 55) return 'fa-cloud-rain'
  if (code <= 65) return 'fa-cloud-rain'
  if (code <= 82) return 'fa-cloud-showers-heavy'
  if (code >= 95) return 'fa-cloud-bolt'
  return 'fa-cloud'
}

export function useWeather() {
  async function fetchWeather() {
    const now = Date.now()
    if (_cache && now - _cache.fetchedAt < CACHE_MS) return _cache.data

    try {
      const res = await fetch(WEATHER_URL)
      if (!res.ok) throw new Error('api error')
      const json = await res.json()

      const hour = new Date().getHours()
      const precip = json.hourly.precipitation_probability
      const codes  = json.hourly.weathercode
      const temps  = json.hourly.temperature_2m

      const precipProb  = precip[hour] ?? null
      const weatherCode = codes[hour]  ?? null
      const temp        = temps?.[hour] != null ? Math.round(temps[hour]) : null
      const weatherLabel = weatherCode !== null ? labelFromCode(weatherCode) : null
      const weatherIcon  = weatherCode !== null ? iconFromCode(weatherCode)  : null
      const tip          = weatherCode !== null ? tipFromCode(weatherCode, precipProb ?? 0) : null

      const isRainy   = precipProb !== null && precipProb >= 60
      const next2     = [precip[hour + 1], precip[hour + 2]].filter(v => v !== undefined)
      const isComing  = !isRainy && next2.some(v => v >= 60)

      const data = { precipProb, weatherCode, temp, weatherLabel, weatherIcon, tip, isRainy, isComing }
      _cache = { data, fetchedAt: now }
      return data
    } catch {
      return { precipProb: null, weatherCode: null, weatherLabel: null, weatherIcon: null, isRainy: false, isComing: false }
    }
  }

  return { fetchWeather }
}
