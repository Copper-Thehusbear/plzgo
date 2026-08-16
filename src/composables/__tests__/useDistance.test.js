import { describe, it, expect } from 'vitest'
import { useDistance, placeLat, placeLng } from '../useDistance'

const { haversine, slotAnytimePlaces } = useDistance()

describe('haversine', () => {
  it('returns 0 for identical points', () => {
    expect(haversine(13.7563, 100.5018, 13.7563, 100.5018)).toBe(0)
  })

  it('matches a known real-world distance (Siam to Chatuchak, ~7km)', () => {
    const km = haversine(13.7460, 100.5340, 13.7999, 100.5500)
    expect(km).toBeGreaterThan(5)
    expect(km).toBeLessThan(9)
  })

  it('is symmetric', () => {
    const a = haversine(13.7460, 100.5340, 13.7999, 100.5500)
    const b = haversine(13.7999, 100.5500, 13.7460, 100.5340)
    expect(a).toBeCloseTo(b, 10)
  })
})

describe('placeLat / placeLng', () => {
  it('reads the nested Firestore location shape', () => {
    const p = { location: { latitude: 13.75, longitude: 100.5 } }
    expect(placeLat(p)).toBe(13.75)
    expect(placeLng(p)).toBe(100.5)
  })

  it('falls back to flat lat/lng for legacy rows', () => {
    const p = { latitude: 13.75, longitude: 100.5 }
    expect(placeLat(p)).toBe(13.75)
    expect(placeLng(p)).toBe(100.5)
  })
})

describe('slotAnytimePlaces', () => {
  const fixed = [
    { id: 'a', location: { latitude: 13.70, longitude: 100.50 } },
    { id: 'b', location: { latitude: 13.80, longitude: 100.60 } },
  ]

  it('returns fixedPlaces unchanged when there are no anytime places', () => {
    expect(slotAnytimePlaces(fixed, [])).toEqual(fixed)
  })

  it('returns anytimePlaces unchanged when there are no fixed places', () => {
    const anytime = [{ id: 'x', location: { latitude: 13.75, longitude: 100.55 } }]
    expect(slotAnytimePlaces([], anytime)).toEqual(anytime)
  })

  it('inserts an anytime place next to its nearest fixed neighbor', () => {
    // Much closer to 'a' (13.70, 100.50) than to 'b' (13.80, 100.60)
    const anytime = [{ id: 'x', location: { latitude: 13.701, longitude: 100.501 } }]
    const result = slotAnytimePlaces(fixed, anytime)
    expect(result).toHaveLength(3)
    const xIndex = result.findIndex(p => p.id === 'x')
    const aIndex = result.findIndex(p => p.id === 'a')
    expect(xIndex).toBe(aIndex + 1)
  })
})
