import { z } from 'zod'

export const AddProductSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  price: z.number().min(0, 'Price must be at least ₱0.01'),
  imageUrl: z.string().optional(),
  printCount: z.number().min(0, 'Print count must be at least 0').optional(),
  category: z.enum(['main', 'add-on']),
})

export type AddProductInput = z.infer<typeof AddProductSchema>
