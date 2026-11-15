import { z } from 'zod'

export const MAX_PRODUCT_IMPORT_FILE_BYTES = 5 * 1024 * 1024

const productImportFileSchema = z.object({
  name: z
    .string()
    .trim()
    .refine(
      (name) => name.toLocaleLowerCase('en-US').endsWith('.xlsx'),
      'Select an .xlsx workbook.'
    ),
  size: z
    .number()
    .positive('The workbook is empty.')
    .max(
      MAX_PRODUCT_IMPORT_FILE_BYTES,
      'The workbook cannot be larger than 5 MiB.'
    ),
})

export const validateProductImportFile = (file: File): string | undefined => {
  const result = productImportFileSchema.safeParse({
    name: file.name,
    size: file.size,
  })
  return result.success ? undefined : result.error.issues[0]?.message
}
