import { describe, it, expect } from 'vitest'
import type { PauseInterval, Segment } from '@delivery/schemas'
import { tripAt } from './trip-at.js'

// Езда 0–100, перерыв 100–150, езда 150–300, ранний приезд: ожидание у точки 300–400.
const segments: Segment[] = [
  { type: 'driving', tStart: 0, tEnd: 100, distStart: 0, distEnd: 1000 },
  { type: 'rest', tStart: 100, tEnd: 150, atDist: 1000, reason: 'break' },
  { type: 'driving', tStart: 150, tEnd: 300, distStart: 1000, distEnd: 2500 },
  { type: 'rest', tStart: 300, tEnd: 400, atDist: 2500, reason: 'wait' },
]

function at(t: number, pauses: PauseInterval[] = []) {
  return tripAt({ segments, pauses }, t)
}

describe('tripAt — status without pauses', () => {
  it.each([
    [-10, 'Pending'],
    [50, 'Driving'],
    [120, 'Resting'],
    [350, 'Resting'],
    [400, 'Arrived'],
  ] as const)('at t=%i the trip is %s', (t, status) => {
    expect(at(t).status).toBe(status)
  })

  it('is Pending when there is no timeline yet', () => {
    expect(tripAt({ segments: [], pauses: [] }, 50).status).toBe('Pending')
  })
})

describe('tripAt — pauses', () => {
  it('is Paused while a pause is active', () => {
    const moment = at(80, [{ pausedAt: 50 }])

    expect(moment.status).toBe('Paused')
    expect(moment.isPaused).toBe(true)
  })

  it('is still Paused before a scheduled resume time', () => {
    expect(at(80, [{ pausedAt: 50, resumedAt: 90 }]).status).toBe('Paused')
  })

  it('shifts the timeline by the paused time after a resume', () => {
    // 20 c паузы: в t=410 по таймлайну ещё 390 — ожидание у точки, а не прибытие.
    const moment = at(410, [{ pausedAt: 50, resumedAt: 70 }])

    expect(moment.status).toBe('Resting')
    expect(moment.isPaused).toBe(false)
  })
})

describe('tripAt — arrival and completion', () => {
  it('arrives at the end of the last driving and completes at the end of the timeline', () => {
    const moment = at(50)

    expect(moment.arrivesAt).toBe(300)
    expect(moment.completesAt).toBe(400)
  })

  it('pushes both times by the time spent on pause, including an ongoing pause', () => {
    const ongoing = at(80, [{ pausedAt: 50 }])
    const finished = at(80, [{ pausedAt: 50, resumedAt: 70 }])

    expect(ongoing).toMatchObject({ arrivesAt: 330, completesAt: 430 })
    expect(finished).toMatchObject({ arrivesAt: 320, completesAt: 420 })
  })

  it('has no times when there is no timeline yet', () => {
    expect(tripAt({ segments: [], pauses: [] }, 50)).toMatchObject({
      arrivesAt: null,
      completesAt: null,
    })
  })
})

describe('tripAt — which pauses move the times', () => {
  it('does not move the times by a pause that started after the event', () => {
    // Приехал в 300, всё закончилось в 400; пауза в 450 — уже после доставки.
    const moment = at(500, [{ pausedAt: 450 }])

    expect(moment).toMatchObject({ arrivesAt: 300, completesAt: 400, status: 'Arrived' })
  })

  it('moves only the events still ahead when a pause hits the trailing wait', () => {
    // Пауза 20 c в 350: приезд (300) уже был, окончание (400) сдвигается до 420.
    const moment = at(380, [{ pausedAt: 350, resumedAt: 370 }])

    expect(moment).toMatchObject({ arrivesAt: 300, completesAt: 420 })
  })

  it('uses the full length of a pause with a scheduled resume', () => {
    const moment = at(80, [{ pausedAt: 50, resumedAt: 90 }])

    expect(moment).toMatchObject({ arrivesAt: 340, completesAt: 440 })
  })

  it('adds up several pauses', () => {
    const moment = at(450, [
      { pausedAt: 20, resumedAt: 30 },
      { pausedAt: 200, resumedAt: 260 },
    ])

    expect(moment).toMatchObject({ arrivesAt: 370, completesAt: 470, status: 'Resting' })
  })

  it('a pause before the start delays the whole trip', () => {
    const moment = at(-5, [{ pausedAt: -10 }])

    expect(moment).toMatchObject({ status: 'Pending', isPaused: true, arrivesAt: 305 })
  })
})

describe('tripAt — current stop', () => {
  it('names the stop and when it ends on the wall clock', () => {
    expect(at(120).stop).toEqual({ reason: 'break', endsAt: 150 })
    expect(at(130, [{ pausedAt: 20, resumedAt: 30 }]).stop).toEqual({
      reason: 'break',
      endsAt: 160,
    })
  })

  it('has no stop while driving', () => {
    expect(at(50).stop).toBeNull()
  })
})
