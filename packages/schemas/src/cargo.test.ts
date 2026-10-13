import { describe, expect, it } from 'vitest'
import { CargoCreateSchema, CargoUpdateSchema } from './cargo.js'

describe('CargoUpdateSchema', () => {
  it('keeps only the fields the client sent, so a partial update does not wipe the rest', () => {
    const parsed = CargoUpdateSchema.parse({ title: 'New' })

    expect(parsed).toEqual({ title: 'New' })
  })

  it('rejects an empty update — there is nothing to change', () => {
    const result = CargoUpdateSchema.safeParse({})

    expect(result.success).toBe(false)
  })

  it('still validates the fields it receives', () => {
    const tooMany = Object.fromEntries(Array.from({ length: 33 }, (_, i) => [`k${i}`, 'v']))

    const result = CargoUpdateSchema.safeParse({ fields: tooMany })

    expect(result.success).toBe(false)
  })
})

describe('CargoCreateSchema', () => {
  it('fills empty fields and photos for a new cargo', () => {
    const parsed = CargoCreateSchema.parse({ title: 'Box' })

    expect(parsed).toEqual({ title: 'Box', fields: {}, photoUploadIds: [] })
  })
})
