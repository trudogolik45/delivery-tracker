import { describe, it, expect } from 'vitest'
import { placeLabel } from './place.js'

describe('placeLabel', () => {
  it('shows the place name when it is known', () => {
    expect(placeLabel({ lat: 40.71, lng: -74.01, label: 'New York' })).toBe('New York')
  })

  it('falls back to rounded coordinates', () => {
    expect(placeLabel({ lat: 40.7128, lng: -74.006 })).toBe('40.71,-74.01')
  })
})
