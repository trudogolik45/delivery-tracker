import { describe, it, expect } from 'vitest'
import { toTrip, toTripListItem } from './trip-view.js'

const STARTS = new Date('2026-10-14T10:00:00.700Z')
const T0 = Math.floor(STARTS.getTime() / 1000)
const polyline = {
  type: 'LineString',
  coordinates: [
    [0, 0],
    [1, 0],
  ],
}
const timeline = [{ type: 'driving', tStart: T0, tEnd: T0 + 3600, distStart: 0, distEnd: 1000 }]

const stored = {
  startsAt: STARTS,
  routeGeometry: polyline,
  timeline,
  totalDistanceMeters: 1000,
  pauses: null,
}

describe('toTrip', () => {
  it('is null until the trip is generated', () => {
    expect(toTrip({ ...stored, routeGeometry: null })).toBeNull()
    expect(toTrip({ ...stored, timeline: null })).toBeNull()
  })

  it('starts at the stored start time and keeps the persisted distance', () => {
    expect(toTrip(stored)).toEqual({
      startedAt: T0,
      polyline,
      totalDistance: 1000,
      segments: timeline,
      pauses: [],
    })
  })

  it('measures the route for legacy rows without a persisted distance', () => {
    const trip = toTrip({ ...stored, totalDistanceMeters: null })

    // Один градус долготы на экваторе ≈ 111.2 км.
    expect(trip!.totalDistance).toBeGreaterThan(111_000)
    expect(trip!.totalDistance).toBeLessThan(111_400)
  })
})

describe('toTripListItem', () => {
  const listRow = {
    id: 'trip-1',
    shareHash: 'hash',
    cargoId: 'cargo-1',
    cargoTitle: null,
    origin: { lat: 1, lng: 2 },
    destination: { lat: 3, lng: 4 },
    startsAt: STARTS,
    desiredArrival: new Date('2026-10-15T10:00:00Z'),
    timeline,
    pauses: [{ pausedAt: T0 + 60 }],
    totalDistanceMeters: 1000,
  }

  it('shows a generated trip with its start, distance and current status', () => {
    const item = toTripListItem(listRow, T0 + 120)

    expect(item).toMatchObject({
      cargoTitle: '',
      startsAt: '2026-10-14T10:00:00.700Z',
      startedAt: T0,
      totalDistance: 1000,
      status: 'Paused',
    })
  })

  it('has no start and is Pending before the trip is generated', () => {
    const item = toTripListItem({ ...listRow, timeline: null, totalDistanceMeters: null }, T0)

    expect(item).toMatchObject({ startedAt: null, totalDistance: null, status: 'Pending' })
  })
})
