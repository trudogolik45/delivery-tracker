import type { PauseInterval, Segment, TripStatus } from '@delivery/schemas'
import { totalPausedSeconds } from './interpolate.js'

export type TripTimeline = { segments: Segment[]; pauses: PauseInterval[] }

export type TripMoment = {
  status: TripStatus
  isPaused: boolean
  /** Приезд к точке выгрузки: конец последней езды (при раннем приезде — до ожидания). */
  arrivesAt: number | null
  /** Конец таймлайна, включая ожидание до желаемого времени. */
  completesAt: number | null
}

// Состояние трипа в момент t (unix-сек). Паузы сдвигают таймлайн: позиция по нему
// считается от t минус всё время, проведённое на паузе к моменту t.
export function tripAt(trip: TripTimeline, t: number): TripMoment {
  const isPaused = isPausedAt(trip.pauses, t)
  const pausedSeconds = totalPausedSeconds(trip.pauses, t)
  const status = statusAt(trip.segments, t - pausedSeconds)
  const shift = (timelineT: number | null) =>
    timelineT === null ? null : timelineT + pausedSeconds
  return {
    status: isPaused && status !== 'Pending' && status !== 'Arrived' ? 'Paused' : status,
    isPaused,
    arrivesAt: shift(lastDrivingEnd(trip.segments)),
    completesAt: shift(trip.segments.at(-1)?.tEnd ?? null),
  }
}

function lastDrivingEnd(segments: Segment[]): number | null {
  for (let i = segments.length - 1; i >= 0; i--) {
    const segment = segments[i]!
    if (segment.type === 'driving') return segment.tEnd
  }
  return null
}

// Паузы append-only: активной может быть только последняя (resumedAt бывает в будущем —
// запланированное авто-возобновление).
function isPausedAt(pauses: PauseInterval[], t: number): boolean {
  const last = pauses.at(-1)
  if (!last || last.pausedAt > t) return false
  return last.resumedAt === undefined || last.resumedAt > t
}

function statusAt(segments: Segment[], t: number): TripStatus {
  const first = segments[0]
  const last = segments.at(-1)
  if (!first || !last || t < first.tStart) return 'Pending'
  if (t >= last.tEnd) return 'Arrived'
  const current = segments.find((s) => s.tStart <= t && t < s.tEnd)
  if (!current) return 'Pending'
  return current.type === 'driving' ? 'Driving' : 'Resting'
}
