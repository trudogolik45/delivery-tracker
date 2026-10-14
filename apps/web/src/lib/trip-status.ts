import type { TripStatus } from '@delivery/schemas'

export type { TripStatus }

export function statusBadgeVariant(status: TripStatus): 'default' | 'outline' | 'secondary' {
  if (status === 'Arrived') return 'default'
  if (status === 'Resting' || status === 'Paused') return 'secondary'
  return 'outline'
}
