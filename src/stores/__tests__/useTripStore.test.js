// @vitest-environment jsdom
// (the store reads localStorage on init — needs a DOM env, unlike the pure-logic tests)
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useTripStore } from '../useTripStore'

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('swipeYep', () => {
  it('adds a place and reports success', () => {
    const store = useTripStore()
    const added = store.swipeYep({ id: 'a' })
    expect(added).toBe(true)
    expect(store.swipedPlaces).toHaveLength(1)
  })

  it('ignores a duplicate swipe on the same place id', () => {
    const store = useTripStore()
    store.swipeYep({ id: 'a' })
    const addedAgain = store.swipeYep({ id: 'a' })
    expect(addedAgain).toBe(false)
    expect(store.swipedPlaces).toHaveLength(1)
  })

  it('refuses once the mode yepCap is reached', () => {
    const store = useTripStore()
    store.tripMode = 'chill' // yepCap: 5
    for (let i = 0; i < 5; i++) store.swipeYep({ id: `p${i}` })
    const overCap = store.swipeYep({ id: 'p-extra' })
    expect(overCap).toBe(false)
    expect(store.swipedPlaces).toHaveLength(5)
  })
})
