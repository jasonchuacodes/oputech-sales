import { describe, expect, it } from 'vitest'
import {
  PaymentType,
  type Transaction,
  TransactionType,
} from '../../services/transaction/transaction.types'
import { getTransactionSummary } from './transaction-summary'

const makeTransaction = (
  transaction: Partial<Transaction> & Pick<Transaction, 'id' | 'type'>
): Transaction => ({
  items: [],
  paymentType: PaymentType.Cash,
  total: 0,
  processed: false,
  occurredAt: '2026-11-12T08:00:00.000Z',
  ...transaction,
})

describe('getTransactionSummary', () => {
  it('totals sales, expenses, payment methods, and quantity-weighted prints', () => {
    const transactions: Transaction[] = [
      makeTransaction({
        id: 'cash-sale',
        type: TransactionType.Sale,
        total: 250,
        items: [
          {
            productId: 'photo',
            name: 'Photo',
            price: 100,
            printCount: 2,
            quantity: 2,
          },
          {
            productId: 'frame',
            name: 'Frame',
            price: 50,
            printCount: 0,
            quantity: 1,
          },
        ],
      }),
      makeTransaction({
        id: 'online-sale',
        type: TransactionType.Sale,
        paymentType: PaymentType.Online,
        total: 300,
        items: [
          {
            productId: 'album',
            name: 'Album',
            price: 300,
            printCount: 10,
            quantity: 1,
          },
        ],
      }),
      makeTransaction({
        id: 'expense',
        type: TransactionType.Expense,
        paymentType: PaymentType.Online,
        total: 75,
      }),
    ]

    expect(getTransactionSummary(transactions)).toEqual({
      total: 475,
      totalCash: 250,
      totalOnline: 300,
      totalPrintCount: 14,
    })
  })

  it('returns zero totals for an empty collection', () => {
    expect(getTransactionSummary([])).toEqual({
      total: 0,
      totalCash: 0,
      totalOnline: 0,
      totalPrintCount: 0,
    })
  })
})
