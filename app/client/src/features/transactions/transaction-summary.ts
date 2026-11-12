import {
  PaymentType,
  type Transaction,
  TransactionType,
} from '../../services/transaction/transaction.types'

export interface TransactionSummary {
  total: number
  totalCash: number
  totalOnline: number
  totalPrintCount: number
}

export const getTransactionSummary = (
  transactions: Transaction[]
): TransactionSummary =>
  transactions.reduce<TransactionSummary>(
    (summary, transaction) => {
      if (transaction.type === TransactionType.Expense) {
        summary.total -= transaction.total
        return summary
      }

      summary.total += transaction.total
      summary.totalPrintCount += transaction.items.reduce(
        (total, item) => total + item.printCount * item.quantity,
        0
      )

      if (transaction.paymentType === PaymentType.Cash) {
        summary.totalCash += transaction.total
      } else {
        summary.totalOnline += transaction.total
      }

      return summary
    },
    {
      total: 0,
      totalCash: 0,
      totalOnline: 0,
      totalPrintCount: 0,
    }
  )
