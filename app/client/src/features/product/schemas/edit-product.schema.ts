import { z } from 'zod'

export const EditProductSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  price: z.number().min(0, 'Price must be at least 0'),
  imageUrl: z.string().nullable().optional(),
  printCount: z.number().min(0, 'Print count must be at least 0').optional(),
  category: z.enum(['main', 'add-on']),
})

export type EditProductInput = z.infer<typeof EditProductSchema>
