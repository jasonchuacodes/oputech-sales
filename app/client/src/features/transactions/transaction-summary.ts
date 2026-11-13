import {
  PaymentType,
  type Transaction,
  TransactionType,
} from '../../services/transaction/transaction.types'

export interface TransactionSummary {
  total: number
  totalCash: number
  totalOnline: number
  totalExpenses: number
  totalPrintCount: number
  products: ProductQuantitySummary[]
}

export interface ProductQuantitySummary {
  productId: string
  name: string
  quantity: number
}

export const getTransactionSummary = (
  transactions: Transaction[]
): TransactionSummary => {
  const productQuantities = new Map<string, ProductQuantitySummary>()
  const summary = transactions.reduce<Omit<TransactionSummary, 'products'>>(
    (current, transaction) => {
      if (transaction.type === TransactionType.Expense) {
        current.total -= transaction.total
        current.totalExpenses += transaction.total
        return current
      }

      current.total += transaction.total
      current.totalPrintCount += transaction.items.reduce(
        (total, item) => total + item.printCount * item.quantity,
        0
      )

      for (const item of transaction.items) {
        const existing = productQuantities.get(item.productId)
        if (existing) {
          existing.quantity += item.quantity
        } else {
          productQuantities.set(item.productId, {
            productId: item.productId,
            name: item.name,
            quantity: item.quantity,
          })
        }
      }

      if (transaction.paymentType === PaymentType.Cash) {
        current.totalCash += transaction.total
      } else {
        current.totalOnline += transaction.total
      }

      return current
    },
    {
      total: 0,
      totalCash: 0,
      totalOnline: 0,
      totalExpenses: 0,
      totalPrintCount: 0,
    }
  )

  return {
    ...summary,
    products: [...productQuantities.values()].sort((left, right) =>
      left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })
    ),
  }
}
