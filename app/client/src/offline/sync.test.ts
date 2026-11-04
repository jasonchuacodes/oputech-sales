import 'fake-indexeddb/auto'
import { AxiosError } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getProducts } from '../services/product/product.api'
import {
  createTransaction,
  deleteTransaction,
  getTransactions,
} from '../services/transaction/transaction.api'
import {
  PaymentType,
  TransactionType,
} from '../services/transaction/transaction.types'
import {
  getLastSyncAt,
  getSnapshotRefreshNeeded,
  offlineDb,
  setSyncLease,
} from './database'
import { flushOutbox } from './sync'

vi.mock('../services/product/product.api', () => ({
  getProducts: vi.fn(),
}))

vi.mock('../services/transaction/transaction.api', () => ({
  createTransaction: vi.fn(),
  deleteTransaction: vi.fn(),
  getTransactions: vi.fn(),
}))

const mockedGetProducts = vi.mocked(getProducts)
const mockedGetTransactions = vi.mocked(getTransactions)
const mockedCreateTransaction = vi.mocked(createTransaction)
const mockedDeleteTransaction = vi.mocked(deleteTransaction)

describe('offline sync worker', () => {
  beforeEach(async () => {
    vi.resetAllMocks()
    mockedGetProducts.mockResolvedValue([])
    mockedGetTransactions.mockResolvedValue([])

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
  })

  it('does not pull a snapshot when there is no work', async () => {
    const result = await flushOutbox()

    expect(result).toEqual({
      status: 'synced',
      completed: 0,
      snapshotRefreshed: false,
    })
    expect(mockedGetProducts).not.toHaveBeenCalled()
    expect(mockedGetTransactions).not.toHaveBeenCalled()
  })

  it('refreshes a requested snapshot and records its completion', async () => {
    const result = await flushOutbox({ refreshSnapshot: true })

    expect(result.status).toBe('synced')
    expect(result.snapshotRefreshed).toBe(true)
    expect(mockedGetProducts).toHaveBeenCalledOnce()
    expect(mockedGetTransactions).toHaveBeenCalledOnce()
    expect(await getLastSyncAt()).toBeDefined()
    expect(await getSnapshotRefreshNeeded()).toBeUndefined()
  })

  it('defers backed-off work without submitting or pulling', async () => {
    await offlineDb.outbox.add({
      operationId: 'operation-1',
      kind: 'CREATE_TRANSACTION',
      entityId: 'local:mutation-1',
      payload: {
        type: TransactionType.Expense,
        paymentType: PaymentType.Cash,
        label: 'Supplies',
        amount: 100,
        clientMutationId: 'mutation-1',
        occurredAt: '2026-11-04T00:00:00.000Z',
      },
      ownerUserId: 'user-1',
      state: 'pending',
      attempts: 1,
      createdAt: '2026-11-04T00:00:00.000Z',
      nextAttemptAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    })

    const result = await flushOutbox()

    expect(result.status).toBe('deferred')
    expect(mockedCreateTransaction).not.toHaveBeenCalled()
    expect(mockedGetProducts).not.toHaveBeenCalled()
  })

  it('backs network failures off for five minutes', async () => {
    await offlineDb.outbox.add({
      operationId: 'operation-1',
      kind: 'CREATE_TRANSACTION',
      entityId: 'local:mutation-1',
      payload: {
        type: TransactionType.Expense,
        paymentType: PaymentType.Cash,
        label: 'Supplies',
        amount: 100,
        clientMutationId: 'mutation-1',
        occurredAt: '2026-11-04T00:00:00.000Z',
      },
      ownerUserId: 'user-1',
      state: 'pending',
      attempts: 0,
      createdAt: '2026-11-04T00:00:00.000Z',
    })
    mockedCreateTransaction.mockRejectedValue(new AxiosError('Network Error'))
    const startedAt = Date.now()

    await expect(flushOutbox()).rejects.toMatchObject({ kind: 'network' })

    const operation = await offlineDb.outbox.get('operation-1')
    const retryAt = new Date(operation?.nextAttemptAt ?? 0).getTime()
    expect(operation?.state).toBe('pending')
    expect(operation?.attempts).toBe(1)
    expect(retryAt).toBeGreaterThanOrEqual(startedAt + 5 * 60 * 1000)
    expect(retryAt).toBeLessThanOrEqual(Date.now() + 5 * 60 * 1000)
  })

  it('retains refresh intent when a snapshot request fails', async () => {
    mockedGetProducts.mockRejectedValue(new AxiosError('Network Error'))

    await expect(flushOutbox({ refreshSnapshot: true })).rejects.toMatchObject({
      kind: 'network',
    })

    expect(await getSnapshotRefreshNeeded()).toBe(true)
    expect(await getLastSyncAt()).toBeUndefined()
  })

  it('allows a manual retry to submit blocked work', async () => {
    await offlineDb.transactions.add({
      id: 'local:mutation-1',
      clientMutationId: 'mutation-1',
      type: TransactionType.Expense,
      items: [],
      label: 'Supplies',
      paymentType: PaymentType.Cash,
      total: 100,
      processed: false,
      occurredAt: '2026-11-04T00:00:00.000Z',
      syncState: 'blocked',
    })
    await offlineDb.outbox.add({
      operationId: 'operation-1',
      kind: 'CREATE_TRANSACTION',
      entityId: 'local:mutation-1',
      payload: {
        type: TransactionType.Expense,
        paymentType: PaymentType.Cash,
        label: 'Supplies',
        amount: 100,
        clientMutationId: 'mutation-1',
        occurredAt: '2026-11-04T00:00:00.000Z',
      },
      ownerUserId: 'user-1',
      state: 'blocked',
      attempts: 1,
      createdAt: '2026-11-04T00:00:00.000Z',
      lastError: 'Needs attention',
    })
    mockedCreateTransaction.mockResolvedValue({
      id: 'server-1',
      clientMutationId: 'mutation-1',
      type: TransactionType.Expense,
      items: [],
      label: 'Supplies',
      paymentType: PaymentType.Cash,
      total: 100,
      processed: false,
      occurredAt: '2026-11-04T00:00:00.000Z',
      createdAt: '2026-11-04T00:00:01.000Z',
    })

    const result = await flushOutbox({ force: true, retryBlocked: true })

    expect(result.status).toBe('synced')
    expect(result.completed).toBe(1)
    expect(mockedCreateTransaction).toHaveBeenCalledOnce()
    expect(await offlineDb.outbox.count()).toBe(0)
  })

  it('reports lease contention instead of claiming success', async () => {
    await setSyncLease({
      owner: 'another-tab',
      expiresAt: new Date(Date.now() + 30_000).toISOString(),
    })

    await expect(flushOutbox()).resolves.toEqual({
      status: 'lease-busy',
      completed: 0,
      snapshotRefreshed: false,
    })
    expect(mockedDeleteTransaction).not.toHaveBeenCalled()
  })
})
