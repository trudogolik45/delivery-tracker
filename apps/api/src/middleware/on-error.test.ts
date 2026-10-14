import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { onError } from './on-error.js'

function makeApp() {
  const app = new Hono()
  app.onError(onError)
  app.post('/echo', zValidator('json', z.object({ title: z.string() })), (c) =>
    c.json(c.req.valid('json')),
  )
  app.get('/boom', () => {
    throw new Error('db exploded')
  })
  return app
}

function postRaw(body: string) {
  return { method: 'POST', headers: { 'content-type': 'application/json' }, body }
}

describe('onError', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('hides an unexpected error behind a generic 500 and logs it', async () => {
    const res = await makeApp().request('/boom')

    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'internal' })
    expect(console.error).toHaveBeenCalledOnce()
  })
  it('answers malformed JSON with 400 and does not log it as a server error', async () => {
    const res = await makeApp().request('/echo', postRaw('{"title":'))

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Malformed JSON in request body' })
    expect(console.error).not.toHaveBeenCalled()
  })
})
