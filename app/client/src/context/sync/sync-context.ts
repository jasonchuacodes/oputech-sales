import { createContext } from 'react'

export type Reachability = 'unknown' | 'reachable' | 'unreachable'
export type SyncPhase = 'idle' | 'checking' | 'syncing' | 'backoff'

export interface SyncContextValue {
  reachability: Reachability
  phase: SyncPhase
  authRequired: boolean
  statsReady: boolean
  isSyncing: boolean
  pendingCount: number
  blockedCount: number
  otherUserPendingCount: number
  progress?: { completed: number; total: number }
  lastSyncAt?: string
  lastError?: string
  storagePersistent?: boolean
  storagePressure?: boolean
  canGenerateReport: boolean
  canModifyCatalog: boolean
  syncNow: () => Promise<void>
  refreshInBackground: () => Promise<void>
  retryBlocked: () => Promise<void>
}

const initialValue: SyncContextValue = {
  reachability: 'unknown',
  phase: 'idle',
  authRequired: false,
  statsReady: false,
  isSyncing: false,
  pendingCount: 0,
  blockedCount: 0,
  otherUserPendingCount: 0,
  canGenerateReport: false,
  canModifyCatalog: false,
  syncNow: async () => undefined,
  refreshInBackground: async () => undefined,
  retryBlocked: async () => undefined,
}

export const SyncContext = createContext<SyncContextValue>(initialValue)

export const notifyOutboxChanged = () => {
  window.dispatchEvent(new Event('oputech-sales-outbox-changed'))
}
