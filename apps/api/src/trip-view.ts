import length from '@turf/length'
import type { LatLng, PauseInterval, Segment, Trip, TripListItem } from '@delivery/schemas'
import { tripAt } from '@delivery/simulation/trip-at'
import type { TripListRow, TripRow } from './db/tenant.js'

type StoredTrip = Pick<
  TripRow,
  'startsAt' | 'routeGeometry' | 'timeline' | 'totalDistanceMeters' | 'pauses'
>

// jsonb-колонки пишет только generateTrip (типизированный Trip), поэтому здесь каст,
// а не parse: проверку формы делает вызывающий там, где она нужна (см. share.ts).
const segmentsOf = (row: Pick<TripRow, 'timeline'>) =>
  Array.isArray(row.timeline) ? (row.timeline as Segment[]) : []
const pausesOf = (row: Pick<TripRow, 'pauses'>) =>
  Array.isArray(row.pauses) ? (row.pauses as PauseInterval[]) : []
const startOf = (row: Pick<TripRow, 'startsAt'>) => Math.floor(row.startsAt.getTime() / 1000)

// Domain Trip из строки БД; null, пока трип не сгенерирован.
export function toTrip(row: StoredTrip): Trip | null {
  if (!row.routeGeometry || !row.timeline) return null
  const polyline = row.routeGeometry as Trip['polyline']
  return {
    startedAt: startOf(row),
    polyline,
    totalDistance: row.totalDistanceMeters ?? measureRoute(polyline),
    segments: segmentsOf(row),
    pauses: pausesOf(row),
  }
}

// Старые строки до колонки total_distance_meters: дистанцию считаем по маршруту.
function measureRoute(polyline: Trip['polyline']): number {
  const km = length(
    { type: 'Feature', geometry: polyline, properties: {} },
    { units: 'kilometers' },
  )
  return Math.round(km * 1000)
}

export function toTripListItem(row: TripListRow, nowSeconds: number): TripListItem {
  const segments = segmentsOf(row)
  return {
    id: row.id,
    shareHash: row.shareHash,
    cargoId: row.cargoId,
    cargoTitle: row.cargoTitle ?? '',
    origin: row.origin as LatLng,
    destination: row.destination as LatLng,
    startsAt: row.startsAt.toISOString(),
    desiredArrival: row.desiredArrival.toISOString(),
    startedAt: segments.length > 0 ? startOf(row) : null,
    totalDistance: row.totalDistanceMeters ?? null,
    status: tripAt({ segments, pauses: pausesOf(row) }, nowSeconds).status,
  }
}
