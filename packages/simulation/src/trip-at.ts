import type { PauseInterval, RestSegment, Segment, TripStatus } from '@delivery/schemas'
import { totalPausedSeconds } from './interpolate.js'

export type TripTimeline = { segments: Segment[]; pauses: PauseInterval[] }

export type TripMoment = {
  status: TripStatus
  isPaused: boolean
  /** Приезд к точке выгрузки: конец последней езды (при раннем приезде — до ожидания). */
  arrivesAt: number | null
  /** Конец таймлайна, включая ожидание до желаемого времени. */
  completesAt: number | null
  /** Текущая остановка по таймлайну и когда она закончится по часам; null — в пути. */
  stop: { reason: RestSegment['reason']; endsAt: number } | null
}

// Состояние трипа в момент t (unix-сек). Паузы сдвигают таймлайн: позиция по нему
// считается от t минус всё время, проведённое на паузе к моменту t.
export function tripAt(trip: TripTimeline, t: number): TripMoment {
  const { segments, pauses } = trip
  const isPaused = isPausedAt(pauses, t)
  const timelineT = t - totalPausedSeconds(pauses, t)
  const current = segmentAt(segments, timelineT)
  const status = statusAt(segments, timelineT, current)
  const wallTime = (timelineTime: number | null) =>
    timelineTime === null ? null : wallTimeOf(timelineTime, pauses, t)
  return {
    status: isPaused && status !== 'Pending' && status !== 'Arrived' ? 'Paused' : status,
    isPaused,
    arrivesAt: wallTime(lastDrivingEnd(segments)),
    completesAt: wallTime(segments.at(-1)?.tEnd ?? null),
    stop:
      current?.type === 'rest'
        ? { reason: current.reason, endsAt: wallTimeOf(current.tEnd, pauses, t) }
        : null,
  }
}

// Момент таймлайна → момент по часам. Сдвигают только паузы, начатые до того, как
// событие наступило: пауза после приезда приезд уже не двигает. Длина активной паузы
// известна, если возобновление запланировано; иначе — сколько она длится к моменту t.
function wallTimeOf(timelineTime: number, pauses: PauseInterval[], t: number): number {
  let wall = timelineTime
  for (const pause of pauses) {
    if (pause.pausedAt >= wall) break
    const resumedAt = pause.resumedAt ?? Math.max(t, pause.pausedAt)
    wall += resumedAt - pause.pausedAt
  }
  return wall
}

// Паузы append-only: активной может быть только последняя (resumedAt бывает в будущем —
// запланированное авто-возобновление).
function isPausedAt(pauses: PauseInterval[], t: number): boolean {
  const last = pauses.at(-1)
  if (!last || last.pausedAt > t) return false
  return last.resumedAt === undefined || last.resumedAt > t
}

function segmentAt(segments: Segment[], t: number): Segment | undefined {
  return segments.find((s) => s.tStart <= t && t < s.tEnd)
}

function statusAt(segments: Segment[], t: number, current: Segment | undefined): TripStatus {
  const first = segments[0]
  const last = segments.at(-1)
  if (!first || !last || t < first.tStart) return 'Pending'
  if (t >= last.tEnd) return 'Arrived'
  if (!current) return 'Pending'
  return current.type === 'driving' ? 'Driving' : 'Resting'
}

function lastDrivingEnd(segments: Segment[]): number | null {
  for (let i = segments.length - 1; i >= 0; i--) {
    const segment = segments[i]!
    if (segment.type === 'driving') return segment.tEnd
  }
  return null
}
