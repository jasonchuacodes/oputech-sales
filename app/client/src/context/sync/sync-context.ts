import { createContext } from 'react'

export type ConnectivityStatus =
  | 'checking'
  | 'offline'
  | 'online'
  | 'syncing'
  | 'blocked'
  | 'auth-required'

export interface SyncContextValue {
  status: ConnectivityStatus
  pendingCount: number
  blockedCount: number
  progress?: { completed: number; total: number }
  lastSyncAt?: string
  lastError?: string
  storagePersistent?: boolean
  storagePressure?: boolean
  canUseOnlineFeatures: boolean
  syncNow: () => Promise<void>
}

const initialValue: SyncContextValue = {
  status: 'checking',
  pendingCount: 0,
  blockedCount: 0,
  canUseOnlineFeatures: false,
  syncNow: async () => undefined,
}

export const SyncContext = createContext<SyncContextValue>(initialValue)

export const notifyOutboxChanged = () => {
  window.dispatchEvent(new Event('oputech-sales-outbox-changed'))
}
