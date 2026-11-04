export interface TransactionItem {
  productId: string
  name: string
  price: number
  printCount: number
  quantity: number
}

export interface Transaction {
  id: string
  serverId?: string
  clientMutationId?: string
  type: TransactionType
  items: TransactionItem[]
  label?: string
  paymentType: PaymentType
  total: number
  processed: boolean
  occurredAt: string
  createdAt?: string
  syncState?: 'pending' | 'synced' | 'deleting' | 'blocked'
}

export interface ServerTransaction extends Transaction {
  createdAt: string
}

export enum PaymentType {
  Cash = 'CASH',
  Online = 'ONLINE',
}

export enum TransactionType {
  Sale = 'SALE',
  Expense = 'EXPENSE',
}
