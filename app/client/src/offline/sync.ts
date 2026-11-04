import { isAxiosError } from 'axios'
import api from '../lib/axios'
import { GraphQLRequestError } from '../lib/graphql'
import { getProducts } from '../services/product/product.api'
import {
  createTransaction,
  deleteTransaction,
  getTransactions,
} from '../services/transaction/transaction.api'
import {
  clearSyncLease,
  getSyncLease,
  offlineDb,
  setLastSyncAt,
  setSyncLease,
  type OutboxOperation,
} from './database'

const HISTORY_DAYS = 30
const LEASE_DURATION_MS = 30_000
const instanceId = crypto.randomUUID()

export type SyncFailureKind = 'auth' | 'network' | 'blocked'

export class SyncFailure extends Error {
  constructor(
    readonly kind: SyncFailureKind,
    message: string
  ) {
    super(message)
    this.name = 'SyncFailure'
  }
}

export const probeApi = async (): Promise<boolean> => {
  try {
    await api.get('/health', { timeout: 5_000 })
    return true
  } catch {
    return false
  }
}

const acquireLease = async (): Promise<boolean> =>
  offlineDb.transaction('rw', offlineDb.meta, async () => {
    const lease = await getSyncLease()
    if (
      lease &&
      lease.owner !== instanceId &&
      new Date(lease.expiresAt).getTime() > Date.now()
    ) {
      return false
    }
    await setSyncLease({
      owner: instanceId,
      expiresAt: new Date(Date.now() + LEASE_DURATION_MS).toISOString(),
    })
    return true
  })

const renewLease = () =>
  setSyncLease({
    owner: instanceId,
    expiresAt: new Date(Date.now() + LEASE_DURATION_MS).toISOString(),
  })

const releaseLease = async () => {
  await offlineDb.transaction('rw', offlineDb.meta, async () => {
    const lease = await getSyncLease()
    if (lease?.owner === instanceId) await clearSyncLease()
  })
}

const classifyError = (error: unknown): SyncFailure => {
  if (isAxiosError(error)) {
    const status = error.response?.status
    if (status === 401 || status === 403) {
      return new SyncFailure('auth', 'Sign in again to sync pending records')
    }
    if (!status || status >= 500) {
      return new SyncFailure('network', error.message || 'The API is unavailable')
    }
    const message =
      (error.response?.data as { message?: string } | undefined)?.message ??
      error.message
    return new SyncFailure('blocked', message)
  }

  if (error instanceof GraphQLRequestError) {
    if (error.status === 401 || error.status === 403) {
      return new SyncFailure('auth', error.message)
    }
    if (error.status && error.status >= 500) {
      return new SyncFailure('network', error.message)
    }
    if (error.code === 'INTERNAL_SERVER_ERROR') {
      return new SyncFailure('network', error.message)
    }
    return new SyncFailure('blocked', error.message)
  }

  return new SyncFailure(
    'blocked',
    error instanceof Error ? error.message : 'Unknown synchronization error'
  )
}

const retryAt = (attempts: number) => {
  const base = Math.min(300_000, 2_000 * 2 ** Math.min(attempts, 8))
  const jitter = Math.floor(Math.random() * Math.max(500, base * 0.2))
  return new Date(Date.now() + base + jitter).toISOString()
}

const markFailed = async (
  operation: OutboxOperation,
  failure: SyncFailure
) => {
  const attempts = operation.attempts + 1
  const blocked = failure.kind === 'blocked'

  await offlineDb.transaction(
    'rw',
    offlineDb.outbox,
    offlineDb.transactions,
    async () => {
      await offlineDb.outbox.update(operation.operationId, {
        attempts,
        state: blocked ? 'blocked' : 'pending',
        nextAttemptAt: blocked ? undefined : retryAt(attempts),
        lastError: failure.message,
      })
      if (blocked) {
        await offlineDb.transactions.update(operation.entityId, {
          syncState: 'blocked',
          ...(operation.kind === 'DELETE_TRANSACTION' ? { deleted: false } : {}),
        })
      }
    }
  )
}

const processCreate = async (operation: OutboxOperation) => {
  if (operation.kind !== 'CREATE_TRANSACTION') return
  const remote = await createTransaction(operation.payload)

  await offlineDb.transaction(
    'rw',
    offlineDb.transactions,
    offlineDb.outbox,
    async () => {
      const local = await offlineDb.transactions.get(operation.entityId)
      if (local) {
        await offlineDb.transactions.put({
          ...remote,
          id: local.id,
          serverId: remote.id,
          occurredAt: local.occurredAt,
          syncState: local.deleted ? 'deleting' : 'synced',
          deleted: local.deleted,
        })
      }
      await offlineDb.outbox.delete(operation.operationId)
    }
  )
}

const processDelete = async (operation: OutboxOperation) => {
  if (operation.kind !== 'DELETE_TRANSACTION') return
  const local = await offlineDb.transactions.get(operation.entityId)
  if (!local) {
    await offlineDb.outbox.delete(operation.operationId)
    return
  }
  if (!local.serverId) {
    throw new SyncFailure('network', 'Waiting for the transaction create to sync')
  }

  await deleteTransaction(local.serverId)
  await offlineDb.transaction(
    'rw',
    offlineDb.transactions,
    offlineDb.outbox,
    async () => {
      await offlineDb.transactions.delete(operation.entityId)
      await offlineDb.outbox.delete(operation.operationId)
    }
  )
}

export const refreshLocalSnapshot = async (): Promise<void> => {
  const cutoff = new Date(Date.now() - HISTORY_DAYS * 24 * 60 * 60 * 1000)
  cutoff.setHours(0, 0, 0, 0)
  const [products, transactions] = await Promise.all([
    getProducts(),
    getTransactions({ from: cutoff.toISOString() }),
  ])
  const cachedAt = new Date().toISOString()

  await offlineDb.transaction(
    'rw',
    offlineDb.products,
    offlineDb.transactions,
    async () => {
      await offlineDb.products.clear()
      await offlineDb.products.bulkPut(
        products.map((product) => ({ ...product, cachedAt }))
      )

      const serverIds = new Set(transactions.map((transaction) => transaction.id))
      for (const remote of transactions) {
        const existing = remote.clientMutationId
          ? await offlineDb.transactions
              .where('clientMutationId')
              .equals(remote.clientMutationId)
              .first()
          : await offlineDb.transactions.get(remote.id)

        await offlineDb.transactions.put({
          ...remote,
          id: existing?.id ?? remote.id,
          serverId: remote.id,
          occurredAt: existing?.occurredAt ?? remote.occurredAt,
          syncState: existing?.deleted ? 'deleting' : 'synced',
          deleted: existing?.deleted,
        })
      }

      const localTransactions = await offlineDb.transactions.toArray()
      for (const local of localTransactions) {
        const isSynced = local.syncState === 'synced'
        const isOutsideWindow = local.occurredAt < cutoff.toISOString()
        const wasRemovedOnServer =
          local.serverId && !serverIds.has(local.serverId) && !local.deleted
        if (isSynced && (isOutsideWindow || wasRemovedOnServer)) {
          await offlineDb.transactions.delete(local.id)
        }
      }
    }
  )

  await setLastSyncAt(cachedAt)
}

export interface FlushOptions {
  force?: boolean
  onProgress?: (completed: number, total: number) => void
}

export const flushOutbox = async ({
  force = false,
  onProgress,
}: FlushOptions = {}): Promise<void> => {
  if (!(await acquireLease())) return

  try {
    const total = await offlineDb.outbox.count()
    let completed = 0

    while (true) {
      const operation = await offlineDb.outbox.orderBy('createdAt').first()
      if (!operation) break
      if (operation.state === 'blocked') {
        throw new SyncFailure('blocked', operation.lastError ?? 'Sync is blocked')
      }
      if (
        !force &&
        operation.nextAttemptAt &&
        new Date(operation.nextAttemptAt).getTime() > Date.now()
      ) {
        break
      }

      await renewLease()
      await offlineDb.outbox.update(operation.operationId, { state: 'syncing' })

      try {
        if (operation.kind === 'CREATE_TRANSACTION') {
          await processCreate(operation)
        } else {
          await processDelete(operation)
        }
        completed += 1
        onProgress?.(completed, total)
      } catch (error) {
        const failure =
          error instanceof SyncFailure ? error : classifyError(error)
        await markFailed(operation, failure)
        throw failure
      }
    }

    if ((await offlineDb.outbox.count()) === 0) await refreshLocalSnapshot()
  } finally {
    await releaseLease()
  }
}

export const retryBlockedOperations = async () => {
  await offlineDb.outbox
    .where('state')
    .equals('blocked')
    .modify({ state: 'pending', nextAttemptAt: undefined, lastError: undefined })
  await offlineDb.transactions
    .where('syncState')
    .equals('blocked')
    .modify({ syncState: 'pending' })
}
