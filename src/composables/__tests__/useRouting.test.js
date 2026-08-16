import { describe, it, expect } from 'vitest'
import { buildOptimalDays, buildDayGeoJSON, buildMapsUrl } from '../useRouting'

function place(id, lat, lng, extra = {}) {
  return { id, name_en: id, location: { latitude: lat, longitude: lng }, duration_minutes: 60, ...extra }
}

describe('buildOptimalDays', () => {
  it('returns an empty result for no places', () => {
    expect(buildOptimalDays([])).toEqual({ days: [], numDays: 0 })
  })

  it('puts a single place on a single day', () => {
    const result = buildOptimalDays([place('a', 13.75, 100.50)])
    expect(result.numDays).toBe(1)
    expect(result.days).toHaveLength(1)
    expect(result.days[0]).toHaveLength(1)
    expect(result.days[0][0].id).toBe('a')
  })

  it('preserves every swiped place exactly once across all days', () => {
    const places = [
      place('a', 13.70, 100.50),
      place('b', 13.71, 100.51),
      place('c', 13.90, 100.70), // far cluster, forces a 2nd/3rd day
      place('d', 13.91, 100.71),
      place('e', 14.10, 100.90),
    ]
    const { days } = buildOptimalDays(places)
    const flatIds = days.flat().map(p => p.id).sort()
    expect(flatIds).toEqual(['a', 'b', 'c', 'd', 'e'])
  })

  it('never schedules more than 3 days', () => {
    const places = Array.from({ length: 12 }, (_, i) =>
      place(`p${i}`, 13.7 + i * 0.3, 100.5 + i * 0.3, { duration_minutes: 180 })
    )
    const { numDays } = buildOptimalDays(places)
    expect(numDays).toBeLessThanOrEqual(3)
  })
})

describe('buildDayGeoJSON', () => {
  it('does not throw and tags each feature with the correct day index', () => {
    const dayBlocks = [
      [place('a', 13.70, 100.50), place('b', 13.71, 100.51)],
      [place('c', 13.90, 100.70)],
    ]
    const geojson = buildDayGeoJSON(dayBlocks)
    expect(geojson.type).toBe('FeatureCollection')
    expect(geojson.features).toHaveLength(3)
    expect(geojson.features[0].properties.dayIndex).toBe(0)
    expect(geojson.features[2].properties.dayIndex).toBe(1)
  })

  it('skips places missing coordinates instead of crashing', () => {
    const dayBlocks = [[{ id: 'no-coords', name_en: 'x' }]]
    const geojson = buildDayGeoJSON(dayBlocks)
    expect(geojson.features).toHaveLength(0)
  })
})

describe('buildMapsUrl', () => {
  it('returns null with no valid places', () => {
    expect(buildMapsUrl([])).toBeNull()
  })

  it('builds a Google Maps directions URL from up to 10 waypoints', () => {
    const places = [place('a', 13.70, 100.50), place('b', 13.71, 100.51)]
    const url = buildMapsUrl(places)
    expect(url).toBe('https://www.google.com/maps/dir/13.7,100.5/13.71,100.51')
  })
})
