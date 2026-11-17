import { z } from 'zod'

const nameSchema = z.string().trim().max(80, 'Use no more than 80 characters.')

export const profileFormSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
})

export const changePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(1, 'Enter your current password.')
    .max(256, 'Use no more than 256 characters.'),
  newPassword: z
    .string()
    .min(6, 'Use at least 6 characters.')
    .max(128, 'Use no more than 128 characters.'),
})

export type ProfileFormValues = z.infer<typeof profileFormSchema>
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>
