import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { offlineDb } from './database'
import {
  listLocalProducts,
  listLocalTransactions,
  queueLocalTransaction,
  queueLocalTransactionDelete,
} from './repository'
import { PaymentType, TransactionType } from '../services/transaction/transaction.types'

const product = {
  id: 'product-1',
  name: 'Photo Strip',
  price: 120,
  printCount: 1,
  category: 'main' as const,
  cachedAt: '2026-08-20T00:00:00.000Z',
}

describe('offline repository', () => {
  beforeEach(async () => {
    await offlineDb.transaction(
      'rw',
      offlineDb.products,
      offlineDb.transactions,
      offlineDb.outbox,
      offlineDb.drafts,
      offlineDb.meta,
      async () => {
        await Promise.all([
          offlineDb.products.clear(),
          offlineDb.transactions.clear(),
          offlineDb.outbox.clear(),
          offlineDb.drafts.clear(),
          offlineDb.meta.clear(),
        ])
      }
    )
    await offlineDb.products.add(product)
  })

  it('creates a local sale and its outbox operation atomically', async () => {
    const transaction = await queueLocalTransaction(
      {
        type: TransactionType.Sale,
        paymentType: PaymentType.Cash,
        items: [{ productId: product.id, quantity: 2 }],
      },
      'user-1'
    )

    expect(transaction.total).toBe(240)
    expect(transaction.syncState).toBe('pending')
    expect(transaction.createdAt).toBeUndefined()
    expect(await offlineDb.transactions.count()).toBe(1)
    const operation = await offlineDb.outbox.toCollection().first()
    expect(operation?.kind).toBe('CREATE_TRANSACTION')
    expect(operation?.entityId).toBe(transaction.id)
    if (operation?.kind === 'CREATE_TRANSACTION') {
      expect(operation.payload.occurredAt).toBe(transaction.occurredAt)
    }
  })

  it('cancels an unsynced create when the transaction is deleted', async () => {
    const transaction = await queueLocalTransaction(
      {
        type: TransactionType.Expense,
        paymentType: PaymentType.Online,
        label: 'Supplies',
        amount: 50,
      },
      'user-1'
    )

    await queueLocalTransactionDelete(transaction.id, 'user-1')

    expect(await offlineDb.transactions.count()).toBe(0)
    expect(await offlineDb.outbox.count()).toBe(0)
  })

  it('searches products and filters transaction history locally', async () => {
    const sale = await queueLocalTransaction(
      {
        type: TransactionType.Sale,
        paymentType: PaymentType.Cash,
        items: [{ productId: product.id, quantity: 1 }],
        occurredAt: '2026-08-20T03:00:00.000Z',
      },
      'user-1'
    )

    expect(await listLocalProducts('strip')).toHaveLength(1)
    expect(
      await listLocalTransactions({
        from: '2026-08-20T00:00:00.000Z',
        to: '2026-08-20T23:59:59.999Z',
      })
    ).toEqual([sale])
    expect(
      await listLocalTransactions({ from: '2026-08-21T00:00:00.000Z' })
    ).toEqual([])
  })
})
