'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { liveQuery } from 'dexie'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthContext } from '../auth/useAuthContext'
import { getLastSyncAt, offlineDb } from '../../offline/database'
import {
  flushOutbox,
  probeApi,
  retryBlockedOperations,
  SyncFailure,
} from '../../offline/sync'
import {
  SyncContext,
  type ConnectivityStatus,
  type SyncContextValue,
} from './sync-context'

export const SyncProvider = ({ children }: { children: ReactNode }) => {
  const { auth } = useAuthContext()
  const queryClient = useQueryClient()
  const running = useRef<Promise<void> | null>(null)
  const statusRef = useRef<ConnectivityStatus>('checking')
  const [status, setStatus] = useState<ConnectivityStatus>('checking')
  const [pendingCount, setPendingCount] = useState(0)
  const [blockedCount, setBlockedCount] = useState(0)
  const [progress, setProgress] = useState<SyncContextValue['progress']>()
  const [lastSyncAt, setLastSyncAtState] = useState<string>()
  const [lastError, setLastError] = useState<string>()
  const [storagePersistent, setStoragePersistent] = useState<boolean>()
  const [storagePressure, setStoragePressure] = useState<boolean>()

  const updateStatus = useCallback((next: ConnectivityStatus) => {
    statusRef.current = next
    setStatus(next)
  }, [])

  const refreshStats = useCallback(async () => {
    const [pending, blocked, syncedAt] = await Promise.all([
      offlineDb.outbox.count(),
      offlineDb.outbox.where('state').equals('blocked').count(),
      getLastSyncAt(),
    ])
    setPendingCount(pending)
    setBlockedCount(blocked)
    setLastSyncAtState(syncedAt)
  }, [])

  const runSync = useCallback(
    async (manual = false) => {
      if (running.current) return running.current

      const task = (async () => {
        const queuedAtStart = await offlineDb.outbox.count()
        const showActivity =
          manual || queuedAtStart > 0 || statusRef.current !== 'online'

        if (showActivity) updateStatus('checking')
        setLastError(undefined)
        if (!(await probeApi())) {
          updateStatus('offline')
          await refreshStats()
          return
        }

        if (!auth) {
          updateStatus('auth-required')
          await refreshStats()
          return
        }

        if (manual && blockedCount > 0) await retryBlockedOperations()

        if (showActivity) updateStatus('syncing')
        try {
          await flushOutbox({
            force: manual,
            onProgress: (completed, total) =>
              setProgress({ completed, total }),
          })
          updateStatus('online')
          await queryClient.invalidateQueries({
            predicate: (query) =>
              ['products', 'transactions', 'reports', 'analytics'].includes(
                String(query.queryKey[0])
              ),
          })
        } catch (error) {
          const failure =
            error instanceof SyncFailure
              ? error
              : new SyncFailure(
                  'network',
                  error instanceof Error ? error.message : 'Sync failed'
                )
          setLastError(failure.message)
          updateStatus(
            failure.kind === 'auth'
              ? 'auth-required'
              : failure.kind === 'blocked'
                ? 'blocked'
                : 'offline'
          )
        } finally {
          setProgress(undefined)
          await refreshStats()
        }
      })()

      running.current = task
      try {
        await task
      } finally {
        running.current = null
      }
    },
    [auth, blockedCount, queryClient, refreshStats, updateStatus]
  )

  const syncNow = useCallback(() => runSync(true), [runSync])

  useEffect(() => {
    const subscription = liveQuery(async () => ({
      pending: await offlineDb.outbox.count(),
      blocked: await offlineDb.outbox.where('state').equals('blocked').count(),
      syncedAt: await getLastSyncAt(),
    })).subscribe(({ pending, blocked, syncedAt }) => {
      setPendingCount(pending)
      setBlockedCount(blocked)
      setLastSyncAtState(syncedAt)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!auth) return
    void runSync()

    const handleReconnect = () => void runSync()
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void runSync()
    }
    window.addEventListener('online', handleReconnect)
    window.addEventListener('oputech-sales-outbox-changed', handleReconnect)
    document.addEventListener('visibilitychange', handleVisibility)
    const interval = window.setInterval(() => void runSync(), 30_000)

    return () => {
      window.removeEventListener('online', handleReconnect)
      window.removeEventListener('oputech-sales-outbox-changed', handleReconnect)
      document.removeEventListener('visibilitychange', handleVisibility)
      window.clearInterval(interval)
    }
  }, [auth, runSync])

  useEffect(() => {
    if (!auth || !navigator.storage?.persist) return
    void navigator.storage.persist().then(setStoragePersistent).catch(() => {
      setStoragePersistent(false)
    })
  }, [auth])

  useEffect(() => {
    if (!auth || !navigator.storage?.estimate) return
    void navigator.storage.estimate().then(({ usage, quota }) => {
      setStoragePressure(
        usage !== undefined && quota !== undefined && quota > 0
          ? usage / quota >= 0.8
          : false
      )
    })
  }, [auth, pendingCount])

  const value = useMemo<SyncContextValue>(
    () => ({
      status,
      pendingCount,
      blockedCount,
      progress,
      lastSyncAt,
      lastError,
      storagePersistent,
      storagePressure,
      canUseOnlineFeatures:
        status === 'online' && pendingCount === 0 && blockedCount === 0,
      syncNow,
    }),
    [
      status,
      pendingCount,
      blockedCount,
      progress,
      lastSyncAt,
      lastError,
      storagePersistent,
      storagePressure,
      syncNow,
    ]
  )

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>
}
