import { describe, expect, it, vi } from 'vitest'
import { TransactionService } from './transaction.service'
import { PaymentType, TransactionType } from './schemas/transaction.schema'

vi.mock('./schemas/transaction.schema', () => ({
  Transaction: class Transaction {},
  PaymentType: { CASH: 'CASH', ONLINE: 'ONLINE' },
  TransactionType: { SALE: 'SALE', EXPENSE: 'EXPENSE' },
}))

vi.mock('../product/schemas/product.schema', () => ({
  Product: class Product {},
}))

const execResult = <T>(value: T) => ({ exec: vi.fn().mockResolvedValue(value) })

describe('TransactionService offline synchronization', () => {
  it('returns the existing transaction for a repeated client mutation id', async () => {
    const existing = {
      id: 'transaction-1',
      occurredAt: new Date('2026-08-20T03:00:00.000Z'),
      createdAt: new Date('2026-08-20T03:15:00.000Z'),
    }
    const transactionModel = {
      findOne: vi.fn().mockReturnValue(execResult(existing)),
      create: vi.fn(),
    }
    const service = new TransactionService(
      transactionModel as never,
      {} as never,
    )

    const result = await service.createTransaction({
      type: TransactionType.EXPENSE,
      label: 'Supplies',
      amount: 100,
      paymentType: PaymentType.CASH,
      clientMutationId: 'mutation-1',
      occurredAt: '2026-08-20T04:00:00.000Z',
    })

    expect(result).toBe(existing)
    expect(result.occurredAt).toEqual(new Date('2026-08-20T03:00:00.000Z'))
    expect(result.createdAt).toEqual(new Date('2026-08-20T03:15:00.000Z'))
    expect(transactionModel.create).not.toHaveBeenCalled()
  })

  it('stores the supplied occurrence time for a new sale', async () => {
    const created = { id: 'transaction-2' }
    const transactionModel = {
      findOne: vi.fn().mockReturnValue(execResult(null)),
      create: vi.fn().mockResolvedValue(created),
    }
    const productModel = {
      find: vi.fn().mockReturnValue(
        execResult([
          {
            _id: { toString: () => 'product-1' },
            name: 'Photo Strip',
            price: 120,
            printCount: 1,
          },
        ]),
      ),
    }
    const service = new TransactionService(
      transactionModel as never,
      productModel as never,
    )

    const result = await service.createTransaction({
      type: TransactionType.SALE,
      items: [{ productId: 'product-1', quantity: 2 }],
      paymentType: PaymentType.ONLINE,
      clientMutationId: 'mutation-2',
      occurredAt: '2026-08-20T03:00:00.000Z',
    })

    expect(result).toBe(created)
    expect(transactionModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        clientMutationId: 'mutation-2',
        occurredAt: new Date('2026-08-20T03:00:00.000Z'),
        total: 240,
      })
    )
  })

  it('queries by occurredAt with a legacy createdAt fallback', async () => {
    const exec = vi.fn().mockResolvedValue([])
    const sort = vi.fn().mockReturnValue({ exec })
    const find = vi.fn().mockReturnValue({ sort })
    const service = new TransactionService({ find } as never, {} as never)

    await service.getTransactions({
      from: '2026-08-20T00:00:00.000Z',
      to: '2026-08-20T23:59:59.999Z',
    })

    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        $or: [
          { occurredAt: expect.any(Object) },
          {
            occurredAt: { $exists: false },
            createdAt: expect.any(Object),
          },
        ],
      })
    )
  })
})
