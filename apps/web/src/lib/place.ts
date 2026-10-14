import type { LatLng } from '@delivery/schemas'

// Название точки, а если его нет — координаты с точностью ~1 км.
export function placeLabel(point: LatLng): string {
  return point.label ?? `${point.lat.toFixed(2)},${point.lng.toFixed(2)}`
}
