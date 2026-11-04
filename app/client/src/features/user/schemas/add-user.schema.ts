import { z } from 'zod'
import { UserRole } from '../../../services/users/users.types'

export const addUserSchema = z.object({
  username: z
    .string()
    .min(1, 'Username is required')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, and underscores allowed'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(Object.values(UserRole) as [string, ...string[]]).optional(),
})

export type AddUserFormValues = z.infer<typeof addUserSchema>
