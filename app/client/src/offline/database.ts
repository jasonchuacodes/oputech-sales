import Dexie, { type EntityTable } from 'dexie'
import { type AuthUser } from '../services/auth/auth.types'
import { type Product } from '../services/product/product.types'
import { type CreateTransactionInput } from '../services/transaction/transaction.api'
import { type Transaction } from '../services/transaction/transaction.types'
import { getActiveTenantId } from '../lib/tenant-scope'

export type SyncState = 'pending' | 'synced' | 'deleting' | 'blocked'
export type OutboxState = 'pending' | 'syncing' | 'blocked'

export interface LocalProduct extends Product {
  tenantId: string
  cachedAt: string
}

export interface LocalTransaction extends Transaction {
  tenantId: string
  serverId?: string
  syncState: SyncState
  deleted?: boolean
}

export interface CreateTransactionOperation {
  operationId: string
  kind: 'CREATE_TRANSACTION'
  entityId: string
  payload: CreateTransactionInput
  ownerUserId: string
  tenantId: string
  state: OutboxState
  attempts: number
  createdAt: string
  nextAttemptAt?: string
  lastError?: string
}

export interface DeleteTransactionOperation {
  operationId: string
  kind: 'DELETE_TRANSACTION'
  entityId: string
  payload: Record<string, never>
  ownerUserId: string
  tenantId: string
  state: OutboxState
  attempts: number
  createdAt: string
  nextAttemptAt?: string
  lastError?: string
}

export type OutboxOperation =
  | CreateTransactionOperation
  | DeleteTransactionOperation

export interface DraftRecord<T = unknown> {
  key: string
  value: T
  updatedAt: string
}

export interface MetaRecord<T = unknown> {
  key: string
  value: T
}

class OfflineDatabase extends Dexie {
  products!: EntityTable<LocalProduct, 'id'>
  transactions!: EntityTable<LocalTransaction, 'id'>
  outbox!: EntityTable<OutboxOperation, 'operationId'>
  drafts!: EntityTable<DraftRecord, 'key'>
  meta!: EntityTable<MetaRecord, 'key'>

  constructor() {
    // Keep the legacy database name so existing installations retain queued sales.
    super('spincam-offline')
    const storesV2 = {
      products: '&id,name,category,cachedAt',
      transactions:
        '&id,&serverId,&clientMutationId,occurredAt,createdAt,syncState,deleted',
      outbox: '&operationId,createdAt,state,nextAttemptAt,entityId',
      drafts: '&key,updatedAt',
      meta: '&key',
    }

    const storesV3 = {
      ...storesV2,
      outbox:
        '&operationId,createdAt,state,nextAttemptAt,entityId,ownerUserId,[ownerUserId+state],[ownerUserId+createdAt]',
    }
    const storesV4 = {
      products: '&id,tenantId,[tenantId+name],name,category,cachedAt',
      transactions:
        '&id,&serverId,&clientMutationId,tenantId,[tenantId+occurredAt],occurredAt,createdAt,syncState,deleted',
      outbox:
        '&operationId,createdAt,state,nextAttemptAt,entityId,ownerUserId,tenantId,[tenantId+ownerUserId],[tenantId+ownerUserId+state],[tenantId+ownerUserId+createdAt]',
      drafts: '&key,updatedAt',
      meta: '&key',
    }
    const storesV6 = {
      ...storesV4,
      products: '&id,tenantId,[tenantId+name],name,cachedAt',
    }

    this.version(1).stores(storesV2)
    this.version(2)
      .stores(storesV2)
      .upgrade((transaction) =>
        transaction
          .table<LocalTransaction, string>('transactions')
          .toCollection()
          .modify((local) => {
            if (!local.serverId) delete local.createdAt
          })
      )
    this.version(3).stores(storesV3)
    this.version(4).stores(storesV4)
    this.version(5)
      .stores(storesV4)
      .upgrade(async (transaction) => {
        await Promise.all([
          transaction.table('products').clear(),
          transaction.table('transactions').clear(),
          transaction.table('outbox').clear(),
          transaction.table('drafts').clear(),
          transaction.table('meta').clear(),
        ])
      })
    this.version(6)
      .stores(storesV6)
      .upgrade((transaction) =>
        transaction
          .table<LocalProduct & { category?: unknown }, string>('products')
          .toCollection()
          .modify((product) => {
            delete product.category
          })
      )
  }
}

export const offlineDb = new OfflineDatabase()

export const countPendingOutboxOperations = (
  ownerUserId: string,
  tenantId: string
) =>
  offlineDb.outbox
    .where('[tenantId+ownerUserId]')
    .equals([tenantId, ownerUserId])
    .count()

const AUTH_KEY = 'cached-auth'
const LAST_SYNC_KEY = 'last-sync-at'
const SNAPSHOT_REFRESH_NEEDED_KEY = 'snapshot-refresh-needed'
const SYNC_LEASE_KEY = 'sync-lease'

export interface CachedAuth {
  user: AuthUser
  validatedAt: string
}

export interface SyncLease {
  owner: string
  expiresAt: string
}

export const getMeta = async <T>(key: string): Promise<T | undefined> =>
  (await offlineDb.meta.get(key))?.value as T | undefined

export const setMeta = async <T>(key: string, value: T): Promise<void> => {
  await offlineDb.meta.put({ key, value })
}

export const deleteMeta = async (key: string): Promise<void> => {
  await offlineDb.meta.delete(key)
}

export const getCachedAuth = () => getMeta<CachedAuth>(AUTH_KEY)
export const setCachedAuth = (value: CachedAuth) => setMeta(AUTH_KEY, value)
export const clearCachedAuth = () => deleteMeta(AUTH_KEY)
const tenantMetaKey = (key: string, tenantId?: string) =>
  tenantId ? `${key}:${tenantId}` : key

export const getLastSyncAt = (tenantId?: string) =>
  getMeta<string>(tenantMetaKey(LAST_SYNC_KEY, tenantId))
export const setLastSyncAt = (value: string, tenantId?: string) =>
  setMeta(tenantMetaKey(LAST_SYNC_KEY, tenantId), value)
export const getSnapshotRefreshNeeded = (tenantId?: string) =>
  getMeta<boolean>(tenantMetaKey(SNAPSHOT_REFRESH_NEEDED_KEY, tenantId))
export const setSnapshotRefreshNeeded = (value: boolean, tenantId?: string) =>
  value
    ? setMeta(tenantMetaKey(SNAPSHOT_REFRESH_NEEDED_KEY, tenantId), true)
    : deleteMeta(tenantMetaKey(SNAPSHOT_REFRESH_NEEDED_KEY, tenantId))
export const getSyncLease = () => getMeta<SyncLease>(SYNC_LEASE_KEY)
export const setSyncLease = (value: SyncLease) => setMeta(SYNC_LEASE_KEY, value)
export const clearSyncLease = () => deleteMeta(SYNC_LEASE_KEY)

export const adoptLegacyOfflineData = async (
  ownerUserId: string,
  tenantId: string
): Promise<void> => {
  await offlineDb.transaction(
    'rw',
    offlineDb.products,
    offlineDb.transactions,
    offlineDb.outbox,
    async () => {
      await offlineDb.products
        .filter((product) => !product.tenantId)
        .modify({ tenantId })
      await offlineDb.transactions
        .filter((transaction) => !transaction.tenantId)
        .modify({ tenantId })
      await offlineDb.outbox
        .filter(
          (operation) =>
            !operation.tenantId && operation.ownerUserId === ownerUserId
        )
        .modify({ tenantId })
    }
  )
}

const scopedDraftKey = (key: string) => {
  const tenantId = getActiveTenantId()
  return tenantId ? `${tenantId}:${key}` : key
}

export const getDraft = async <T>(key: string): Promise<T | undefined> =>
  (await offlineDb.drafts.get(scopedDraftKey(key)))?.value as T | undefined

export const saveDraft = async <T>(key: string, value: T): Promise<void> => {
  await offlineDb.drafts.put({
    key: scopedDraftKey(key),
    value,
    updatedAt: new Date().toISOString(),
  })
}

export const clearDraft = async (key: string): Promise<void> => {
  await offlineDb.drafts.delete(scopedDraftKey(key))
}
