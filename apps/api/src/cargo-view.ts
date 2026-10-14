import type { Brand, CargoWithPhotos } from '@delivery/schemas'
import { tenantDb, type CargoRow } from './db/tenant.js'
import { resolvePhotoUrlMap } from './uploads.js'

type CargoFields = Pick<CargoRow, 'id' | 'title' | 'fields' | 'photoUploadIds' | 'createdAt'>

// Груз в форме ответа API. Фото без URL (чужие или удалённые загрузки) не показываем.
export function toCargoWithPhotos(
  row: CargoFields,
  photoUrlById: Map<string, string>,
): CargoWithPhotos {
  return {
    id: row.id,
    title: row.title,
    fields: row.fields as Record<string, string>,
    photoUploadIds: row.photoUploadIds,
    photoUrls: row.photoUploadIds
      .map((id) => photoUrlById.get(id))
      .filter((url): url is string => url !== undefined),
    createdAt: row.createdAt.toISOString(),
  }
}

// URL фото для всех грузов — одним запросом, только загрузки этого бренда.
export async function cargoWithPhotos(
  brandId: string,
  rows: CargoFields[],
): Promise<CargoWithPhotos[]> {
  const photoUrlById = await resolvePhotoUrlMap(
    brandId,
    rows.flatMap((row) => row.photoUploadIds),
  )
  return rows.map((row) => toCargoWithPhotos(row, photoUrlById))
}

// Все фото — загрузки этого бренда (чужой или несуществующий id → false).
export async function ownsAllPhotos(brand: Brand, photoUploadIds: string[]): Promise<boolean> {
  if (photoUploadIds.length === 0) return true
  const found = await tenantDb(brand).uploads.findOwnedIds(photoUploadIds)
  return found.length === photoUploadIds.length
}
