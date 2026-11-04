import { PaymentType, TransactionType } from './schemas/transaction.schema'

export interface TransactionFilter {
  from?: string
  to?: string
  processed?: boolean
}

export interface TransactionItemInput {
  productId: string
  quantity: number
}

export interface CreateTransactionInput {
  type: TransactionType
  items?: TransactionItemInput[]
  label?: string
  amount?: number
  paymentType: PaymentType
  clientMutationId?: string
  occurredAt?: string
}
