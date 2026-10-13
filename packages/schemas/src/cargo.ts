import { z } from 'zod'

export const CargoSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  fields: z.record(z.string(), z.string()),
  photoUploadIds: z.array(z.uuid()),
  createdAt: z.string(),
})
export type Cargo = z.infer<typeof CargoSchema>

export const CargoWithPhotosSchema = CargoSchema.extend({
  photoUrls: z.array(z.string()),
})
export type CargoWithPhotos = z.infer<typeof CargoWithPhotosSchema>

const CargoFieldsSchema = z
  .record(z.string().min(1).max(64), z.string().max(2000))
  .refine((o) => Object.keys(o).length <= 32, { message: 'too many fields' })
const CargoPhotoUploadIdsSchema = z.array(z.uuid()).max(20)

export const CargoCreateSchema = z.object({
  title: z.string().min(1).max(255),
  fields: CargoFieldsSchema.default({}),
  photoUploadIds: CargoPhotoUploadIdsSchema.default([]),
})
export type CargoCreate = z.infer<typeof CargoCreateSchema>

// Без .default(): иначе частичный PUT подставит {} и [] и затрёт то, что клиент не прислал.
export const CargoUpdateSchema = z
  .object({
    title: CargoCreateSchema.shape.title,
    fields: CargoFieldsSchema,
    photoUploadIds: CargoPhotoUploadIdsSchema,
  })
  .partial()
  .refine((o) => Object.keys(o).length > 0, { message: 'nothing to update' })
export type CargoUpdate = z.infer<typeof CargoUpdateSchema>
