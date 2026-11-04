import Dexie, { type EntityTable } from 'dexie'
import { type AuthUser } from '../services/auth/auth.types'
import { type Product } from '../services/product/product.types'
import { type CreateTransactionInput } from '../services/transaction/transaction.api'
import { type Transaction } from '../services/transaction/transaction.types'

export type SyncState = 'pending' | 'synced' | 'deleting' | 'blocked'
export type OutboxState = 'pending' | 'syncing' | 'blocked'

export interface LocalProduct extends Product {
  cachedAt: string
}

export interface LocalTransaction extends Transaction {
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
    const stores = {
      products: '&id,name,category,cachedAt',
      transactions:
        '&id,&serverId,&clientMutationId,occurredAt,createdAt,syncState,deleted',
      outbox: '&operationId,createdAt,state,nextAttemptAt,entityId',
      drafts: '&key,updatedAt',
      meta: '&key',
    }

    this.version(1).stores(stores)
    this.version(2)
      .stores(stores)
      .upgrade((transaction) =>
        transaction
          .table<LocalTransaction, string>('transactions')
          .toCollection()
          .modify((local) => {
            if (!local.serverId) delete local.createdAt
          })
      )
  }
}

export const offlineDb = new OfflineDatabase()

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
export const getLastSyncAt = () => getMeta<string>(LAST_SYNC_KEY)
export const setLastSyncAt = (value: string) => setMeta(LAST_SYNC_KEY, value)
export const getSnapshotRefreshNeeded = () =>
  getMeta<boolean>(SNAPSHOT_REFRESH_NEEDED_KEY)
export const setSnapshotRefreshNeeded = (value: boolean) =>
  value
    ? setMeta(SNAPSHOT_REFRESH_NEEDED_KEY, true)
    : deleteMeta(SNAPSHOT_REFRESH_NEEDED_KEY)
export const getSyncLease = () => getMeta<SyncLease>(SYNC_LEASE_KEY)
export const setSyncLease = (value: SyncLease) => setMeta(SYNC_LEASE_KEY, value)
export const clearSyncLease = () => deleteMeta(SYNC_LEASE_KEY)

export const getDraft = async <T>(key: string): Promise<T | undefined> =>
  (await offlineDb.drafts.get(key))?.value as T | undefined

export const saveDraft = async <T>(key: string, value: T): Promise<void> => {
  await offlineDb.drafts.put({
    key,
    value,
    updatedAt: new Date().toISOString(),
  })
}

export const clearDraft = async (key: string): Promise<void> => {
  await offlineDb.drafts.delete(key)
}
