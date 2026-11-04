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
  getSnapshotRefreshNeeded,
  getSyncLease,
  offlineDb,
  setLastSyncAt,
  setSnapshotRefreshNeeded,
  setSyncLease,
  type OutboxOperation,
} from './database'

const HISTORY_DAYS = 30
const LEASE_DURATION_MS = 30_000
const LEASE_RENEW_INTERVAL_MS = 10_000
const RETRY_DELAY_MS = 5 * 60 * 1000
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

class LeaseLostError extends SyncFailure {
  constructor() {
    super('network', 'Synchronization continued in another tab')
    this.name = 'LeaseLostError'
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

const renewLease = async (): Promise<boolean> =>
  offlineDb.transaction('rw', offlineDb.meta, async () => {
    const lease = await getSyncLease()
    if (lease?.owner !== instanceId) return false
    await setSyncLease({
      owner: instanceId,
      expiresAt: new Date(Date.now() + LEASE_DURATION_MS).toISOString(),
    })
    return true
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
    if (status === 401) {
      return new SyncFailure('auth', 'Sign in again to sync pending records')
    }
    if (!status || status >= 500) {
      return new SyncFailure(
        'network',
        error.message || 'The API is unavailable'
      )
    }
    const message =
      (error.response?.data as { message?: string } | undefined)?.message ??
      error.message
    return new SyncFailure('blocked', message)
  }

  if (error instanceof GraphQLRequestError) {
    if (error.status === 401 || error.code === 'UNAUTHENTICATED') {
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

const retryAt = () => new Date(Date.now() + RETRY_DELAY_MS).toISOString()

const markFailed = async (operation: OutboxOperation, failure: SyncFailure) => {
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
        nextAttemptAt: blocked ? undefined : retryAt(),
        lastError: failure.message,
      })
      if (blocked) {
        await offlineDb.transactions.update(operation.entityId, {
          syncState: 'blocked',
          ...(operation.kind === 'DELETE_TRANSACTION'
            ? { deleted: false }
            : {}),
        })
      }
    }
  )
}

const processCreate = async (
  operation: OutboxOperation,
  ensureLease: () => Promise<void>
) => {
  if (operation.kind !== 'CREATE_TRANSACTION') return
  const remote = await createTransaction(operation.payload, operation.tenantId)
  await ensureLease()

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
          tenantId: operation.tenantId,
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

const processDelete = async (
  operation: OutboxOperation,
  ensureLease: () => Promise<void>
) => {
  if (operation.kind !== 'DELETE_TRANSACTION') return
  const local = await offlineDb.transactions.get(operation.entityId)
  if (!local) {
    await offlineDb.outbox.delete(operation.operationId)
    return
  }
  if (!local.serverId) {
    throw new SyncFailure(
      'network',
      'Waiting for the transaction create to sync'
    )
  }

  await deleteTransaction(local.serverId, operation.tenantId)
  await ensureLease()
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

export const refreshLocalSnapshot = async (
  tenantId: string,
  beforeCommit?: () => Promise<void>
): Promise<void> => {
  await setSnapshotRefreshNeeded(true, tenantId)
  const requestedAt = new Date().toISOString()
  const cutoff = new Date(Date.now() - HISTORY_DAYS * 24 * 60 * 60 * 1000)
  cutoff.setHours(0, 0, 0, 0)
  const [products, transactions] = await Promise.all([
    getProducts(undefined, tenantId),
    getTransactions({ from: cutoff.toISOString() }, tenantId),
  ])
  const cachedAt = new Date().toISOString()
  await beforeCommit?.()

  await offlineDb.transaction(
    'rw',
    offlineDb.products,
    offlineDb.transactions,
    offlineDb.meta,
    async () => {
      const recentLocalProducts = await offlineDb.products
        .where('tenantId')
        .equals(tenantId)
        .filter((product) => product.cachedAt > requestedAt)
        .toArray()
      const recentById = new Map(
        recentLocalProducts.map((product) => [product.id, product])
      )
      const mergedProducts = products.map(
        (product) =>
          recentById.get(product.id) ?? { ...product, tenantId, cachedAt }
      )
      const remoteProductIds = new Set(products.map((product) => product.id))

      await offlineDb.products.where('tenantId').equals(tenantId).delete()
      await offlineDb.products.bulkPut(
        mergedProducts.concat(
          recentLocalProducts.filter(
            (product) => !remoteProductIds.has(product.id)
          )
        )
      )

      const serverIds = new Set(
        transactions.map((transaction) => transaction.id)
      )
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
          tenantId,
          serverId: remote.id,
          occurredAt: existing?.occurredAt ?? remote.occurredAt,
          syncState: existing?.deleted ? 'deleting' : 'synced',
          deleted: existing?.deleted,
        })
      }

      const localTransactions = await offlineDb.transactions
        .where('tenantId')
        .equals(tenantId)
        .toArray()
      for (const local of localTransactions) {
        const isSynced = local.syncState === 'synced'
        const isOutsideWindow = local.occurredAt < cutoff.toISOString()
        const wasRemovedOnServer =
          local.serverId && !serverIds.has(local.serverId) && !local.deleted
        if (isSynced && (isOutsideWindow || wasRemovedOnServer)) {
          await offlineDb.transactions.delete(local.id)
        }
      }

      await setLastSyncAt(cachedAt, tenantId)
      await setSnapshotRefreshNeeded(false, tenantId)
    }
  )
}

export interface FlushOptions {
  ownerUserId: string
  tenantId: string
  force?: boolean
  refreshSnapshot?: boolean
  retryBlocked?: boolean
  onProgress?: (completed: number, total: number) => void
}

export interface FlushResult {
  status: 'synced' | 'deferred' | 'lease-busy'
  completed: number
  snapshotRefreshed: boolean
}

export const flushOutbox = async ({
  ownerUserId,
  tenantId,
  force = false,
  refreshSnapshot = false,
  retryBlocked = false,
  onProgress,
}: FlushOptions): Promise<FlushResult> => {
  if (!(await acquireLease())) {
    return { status: 'lease-busy', completed: 0, snapshotRefreshed: false }
  }

  let leaseLost = false
  const ensureLease = async () => {
    if (leaseLost || !(await renewLease())) {
      leaseLost = true
      throw new LeaseLostError()
    }
  }
  const heartbeat = setInterval(() => {
    void renewLease()
      .then((renewed) => {
        if (!renewed) leaseLost = true
      })
      .catch(() => {
        leaseLost = true
      })
  }, LEASE_RENEW_INTERVAL_MS)

  try {
    if (refreshSnapshot) await setSnapshotRefreshNeeded(true, tenantId)
    if (retryBlocked) await retryBlockedOperations(ownerUserId, tenantId)

    const ownerOperations = () =>
      offlineDb.outbox
        .where('[tenantId+ownerUserId]')
        .equals([tenantId, ownerUserId])
        .sortBy('createdAt')

    const total = (await ownerOperations()).length
    let completed = 0
    let deferredWork = false

    while (true) {
      const operations = await ownerOperations()
      if (operations.length === 0) break

      const seenEntities = new Set<string>()
      const firstOperations = operations.filter((operation) => {
        if (seenEntities.has(operation.entityId)) return false
        seenEntities.add(operation.entityId)
        return true
      })
      const operation = firstOperations.find(
        (candidate) =>
          candidate.state !== 'blocked' &&
          (force ||
            !candidate.nextAttemptAt ||
            new Date(candidate.nextAttemptAt).getTime() <= Date.now())
      )

      if (!operation) {
        deferredWork = firstOperations.some(
          (candidate) => candidate.state !== 'blocked'
        )
        break
      }

      await ensureLease()
      await offlineDb.outbox.update(operation.operationId, { state: 'syncing' })

      try {
        if (operation.kind === 'CREATE_TRANSACTION') {
          await processCreate(operation, ensureLease)
        } else {
          await processDelete(operation, ensureLease)
        }
        completed += 1
        onProgress?.(completed, total)
      } catch (error) {
        if (error instanceof LeaseLostError) throw error
        const failure =
          error instanceof SyncFailure ? error : classifyError(error)
        await markFailed(operation, failure)
        if (failure.kind === 'blocked') continue
        throw failure
      }
    }

    const shouldRefreshSnapshot =
      refreshSnapshot ||
      (await getSnapshotRefreshNeeded(tenantId)) === true
    if (shouldRefreshSnapshot) {
      try {
        await refreshLocalSnapshot(tenantId, ensureLease)
      } catch (error) {
        throw error instanceof SyncFailure ? error : classifyError(error)
      }
    }

    if ((await ownerOperations()).length > 0 || deferredWork) {
      return {
        status: 'deferred',
        completed,
        snapshotRefreshed: shouldRefreshSnapshot,
      }
    }

    return {
      status: 'synced',
      completed,
      snapshotRefreshed: shouldRefreshSnapshot,
    }
  } finally {
    clearInterval(heartbeat)
    await releaseLease()
  }
}

export const retryBlockedOperations = async (
  ownerUserId: string,
  tenantId: string
) => {
  const operations = await offlineDb.outbox
    .where('[tenantId+ownerUserId+state]')
    .equals([tenantId, ownerUserId, 'blocked'])
    .toArray()

  await offlineDb.transaction(
    'rw',
    offlineDb.outbox,
    offlineDb.transactions,
    async () => {
      for (const operation of operations) {
        await offlineDb.outbox.update(operation.operationId, {
          state: 'pending',
          nextAttemptAt: undefined,
          lastError: undefined,
        })
        await offlineDb.transactions.update(operation.entityId, {
          syncState:
            operation.kind === 'DELETE_TRANSACTION' ? 'deleting' : 'pending',
          ...(operation.kind === 'DELETE_TRANSACTION' ? { deleted: true } : {}),
        })
      }
    }
  )
}
