import { z } from 'zod'
import { PaymentType } from '../../../services/transaction/transaction.types'

export const LogExpenseSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  paymentType: z.enum(PaymentType),
})

export type LogExpenseInput = z.infer<typeof LogExpenseSchema>
