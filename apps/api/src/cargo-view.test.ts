import { describe, it, expect, vi } from 'vitest'

vi.mock('./uploads.js', () => ({ resolvePhotoUrlMap: vi.fn() }))
vi.mock('./db/tenant.js', () => ({ tenantDb: vi.fn() }))

import { resolvePhotoUrlMap } from './uploads.js'
import { tenantDb } from './db/tenant.js'
import { cargoWithPhotos, ownsAllPhotos, toCargoWithPhotos } from './cargo-view.js'

const row = {
  id: 'cargo-1',
  brandId: 'brand-a',
  title: 'Box',
  fields: { weight: '10kg' },
  photoUploadIds: ['photo-1', 'photo-foreign', 'photo-2'],
  createdAt: new Date('2026-10-14T10:00:00Z'),
}

describe('toCargoWithPhotos', () => {
  it('turns a cargo row into the API shape with photo URLs in the stored order', () => {
    const urls = new Map([
      ['photo-2', 'https://cdn/2.jpg'],
      ['photo-1', 'https://cdn/1.jpg'],
    ])

    const view = toCargoWithPhotos(row, urls)

    expect(view).toEqual({
      id: 'cargo-1',
      title: 'Box',
      fields: { weight: '10kg' },
      photoUploadIds: ['photo-1', 'photo-foreign', 'photo-2'],
      photoUrls: ['https://cdn/1.jpg', 'https://cdn/2.jpg'],
      createdAt: '2026-10-14T10:00:00.000Z',
    })
  })
})

describe('cargoWithPhotos', () => {
  it('resolves photos of all cargo in one brand-scoped lookup', async () => {
    vi.mocked(resolvePhotoUrlMap).mockResolvedValue(new Map([['photo-1', 'https://cdn/1.jpg']]))
    const other = { ...row, id: 'cargo-2', photoUploadIds: ['photo-3'] }

    const views = await cargoWithPhotos('brand-a', [row, other])

    expect(resolvePhotoUrlMap).toHaveBeenCalledOnce()
    expect(resolvePhotoUrlMap).toHaveBeenCalledWith('brand-a', [
      'photo-1',
      'photo-foreign',
      'photo-2',
      'photo-3',
    ])
    expect(views.map((v) => v.photoUrls)).toEqual([['https://cdn/1.jpg'], []])
  })
})

describe('ownsAllPhotos', () => {
  const brand = { id: 'brand-a', slug: 'a', name: 'A', shareDomain: 'a.example.com' }

  function brandOwns(ids: string[]) {
    const findOwnedIds = vi.fn().mockResolvedValue(ids)
    vi.mocked(tenantDb).mockReturnValue({ uploads: { findOwnedIds } } as never)
    return findOwnedIds
  }

  it('accepts photos that all belong to the brand', async () => {
    brandOwns(['photo-1', 'photo-2'])

    expect(await ownsAllPhotos(brand, ['photo-1', 'photo-2'])).toBe(true)
  })

  it('rejects a list with a foreign or unknown photo', async () => {
    brandOwns(['photo-1'])

    expect(await ownsAllPhotos(brand, ['photo-1', 'photo-foreign'])).toBe(false)
  })

  it('accepts no photos without asking the database', async () => {
    const findOwnedIds = brandOwns([])

    expect(await ownsAllPhotos(brand, [])).toBe(true)
    expect(findOwnedIds).not.toHaveBeenCalled()
  })
})
