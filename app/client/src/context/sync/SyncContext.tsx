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
import {
  getLastSyncAt,
  getSnapshotRefreshNeeded,
  offlineDb,
  setSnapshotRefreshNeeded,
} from '../../offline/database'
import { flushOutbox, probeApi, SyncFailure } from '../../offline/sync'
import {
  SyncContext,
  type ConnectivityStatus,
  type SyncContextValue,
} from './sync-context'

const AUTOMATIC_RETRY_MS = 5 * 60 * 1000

interface SyncRequest {
  source: 'automatic' | 'bootstrap' | 'manual' | 'reconnect'
  refreshSnapshot?: boolean
}

const mergeSyncRequests = (
  current: SyncRequest | null,
  next: SyncRequest
): SyncRequest => ({
  source:
    current?.source === 'manual' || next.source === 'manual'
      ? 'manual'
      : next.source,
  refreshSnapshot: current?.refreshSnapshot || next.refreshSnapshot,
})

export const SyncProvider = ({ children }: { children: ReactNode }) => {
  const { auth } = useAuthContext()
  const authId = auth?.id
  const queryClient = useQueryClient()
  const running = useRef<Promise<void> | null>(null)
  const queuedRequest = useRef<SyncRequest | null>(null)
  const runSyncRef = useRef<(request: SyncRequest) => Promise<void>>(async () =>
    Promise.resolve()
  )
  const statusRef = useRef<ConnectivityStatus>('checking')
  const retryAtRef = useRef<number | undefined>(undefined)
  const observedSyncAt = useRef<string | undefined>(undefined)
  const [status, setStatus] = useState<ConnectivityStatus>('checking')
  const [pendingCount, setPendingCount] = useState(0)
  const [blockedCount, setBlockedCount] = useState(0)
  const [progress, setProgress] = useState<SyncContextValue['progress']>()
  const [lastSyncAt, setLastSyncAtState] = useState<string>()
  const [lastError, setLastError] = useState<string>()
  const [storagePersistent, setStoragePersistent] = useState<boolean>()
  const [storagePressure, setStoragePressure] = useState<boolean>()
  const [retryAt, setRetryAt] = useState<number>()

  const updateStatus = useCallback((next: ConnectivityStatus) => {
    statusRef.current = next
    setStatus(next)
  }, [])

  const refreshStats = useCallback(async () => {
    const [pending, blocked, syncedAt, snapshotRefreshNeeded] =
      await Promise.all([
        offlineDb.outbox.count(),
        offlineDb.outbox.where('state').equals('blocked').count(),
        getLastSyncAt(),
        getSnapshotRefreshNeeded(),
      ])
    setPendingCount(pending)
    setBlockedCount(blocked)
    setLastSyncAtState(syncedAt)
    return {
      pending,
      blocked,
      syncedAt,
      snapshotRefreshNeeded: !!snapshotRefreshNeeded,
    }
  }, [])

  const scheduleRetry = useCallback(() => {
    const dueAt = Date.now() + AUTOMATIC_RETRY_MS
    if (retryAtRef.current && retryAtRef.current <= dueAt) return
    retryAtRef.current = dueAt
    setRetryAt(dueAt)
  }, [])

  const cancelRetry = useCallback(() => {
    retryAtRef.current = undefined
    setRetryAt(undefined)
  }, [])

  const runSync = useCallback(
    async (request: SyncRequest) => {
      if (running.current) {
        queuedRequest.current = mergeSyncRequests(
          queuedRequest.current,
          request
        )
        return running.current
      }

      const task = (async () => {
        const manual = request.source === 'manual'
        if (request.refreshSnapshot) await setSnapshotRefreshNeeded(true)

        const statsAtStart = await refreshStats()
        const showActivity =
          manual ||
          statsAtStart.pending > 0 ||
          statsAtStart.snapshotRefreshNeeded ||
          request.refreshSnapshot ||
          statusRef.current !== 'online'

        if (showActivity) updateStatus('checking')
        setLastError(undefined)
        if (!manual && navigator.onLine === false) {
          updateStatus('offline')
          scheduleRetry()
          return
        }
        if (!(await probeApi())) {
          updateStatus('offline')
          const stats = await refreshStats()
          if (stats.pending > 0 || stats.snapshotRefreshNeeded) scheduleRetry()
          return
        }

        if (!authId) {
          updateStatus('auth-required')
          await refreshStats()
          return
        }

        if (showActivity) updateStatus('syncing')
        try {
          const result = await flushOutbox({
            force: manual,
            refreshSnapshot: request.refreshSnapshot,
            retryBlocked: manual,
            onProgress: (completed, total) => setProgress({ completed, total }),
          })
          updateStatus('online')
          if (result.completed > 0 || result.snapshotRefreshed) {
            await queryClient.invalidateQueries({
              predicate: (query) =>
                ['products', 'transactions', 'reports', 'analytics'].includes(
                  String(query.queryKey[0])
                ),
            })
          }

          const stats = await refreshStats()
          if (
            result.status === 'synced' &&
            stats.pending === 0 &&
            !stats.snapshotRefreshNeeded
          ) {
            cancelRetry()
          } else {
            scheduleRetry()
          }
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
          if (failure.kind === 'network') scheduleRetry()
        } finally {
          setProgress(undefined)
          await refreshStats()
        }
      })().catch(async (error) => {
        setProgress(undefined)
        setLastError(
          error instanceof Error
            ? error.message
            : 'Local synchronization failed'
        )
        updateStatus('blocked')
        try {
          await refreshStats()
        } catch {
          // Keep the actionable error visible when browser storage is unavailable.
        }
      })

      running.current = task
      try {
        await task
      } finally {
        running.current = null
        const nextRequest = queuedRequest.current
        queuedRequest.current = null
        if (nextRequest) {
          queueMicrotask(() => void runSyncRef.current(nextRequest))
        }
      }
    },
    [
      authId,
      cancelRetry,
      queryClient,
      refreshStats,
      scheduleRetry,
      updateStatus,
    ]
  )

  useEffect(() => {
    runSyncRef.current = runSync
  }, [runSync])

  const syncNow = useCallback(
    () => runSync({ source: 'manual', refreshSnapshot: true }),
    [runSync]
  )

  useEffect(() => {
    const subscription = liveQuery(async () => ({
      pending: await offlineDb.outbox.count(),
      blocked: await offlineDb.outbox.where('state').equals('blocked').count(),
      syncedAt: await getLastSyncAt(),
      snapshotRefreshNeeded: !!(await getSnapshotRefreshNeeded()),
    })).subscribe(({ pending, blocked, syncedAt, snapshotRefreshNeeded }) => {
      setPendingCount(pending)
      setBlockedCount(blocked)
      setLastSyncAtState(syncedAt)
      if (pending === 0 && !snapshotRefreshNeeded) cancelRetry()

      if (observedSyncAt.current && observedSyncAt.current !== syncedAt) {
        void queryClient.invalidateQueries({
          predicate: (query) =>
            ['products', 'transactions', 'reports', 'analytics'].includes(
              String(query.queryKey[0])
            ),
        })
      }
      observedSyncAt.current = syncedAt
    })
    return () => subscription.unsubscribe()
  }, [cancelRetry, queryClient])

  useEffect(() => {
    if (!authId) {
      queuedRequest.current = null
      retryAtRef.current = undefined
      queueMicrotask(cancelRetry)
      return
    }
    void runSync({ source: 'bootstrap', refreshSnapshot: true })

    const handleReconnect = () =>
      void runSync({ source: 'reconnect', refreshSnapshot: true })
    const handleOffline = () => updateStatus('offline')
    const handleOutboxChanged = () => void runSync({ source: 'automatic' })
    const handleVisibility = () => {
      if (
        document.visibilityState === 'visible' &&
        retryAtRef.current !== undefined &&
        retryAtRef.current <= Date.now()
      ) {
        cancelRetry()
        void runSync({ source: 'automatic' })
      }
    }
    window.addEventListener('online', handleReconnect)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('oputech-sales-outbox-changed', handleOutboxChanged)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      window.removeEventListener('online', handleReconnect)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener(
        'oputech-sales-outbox-changed',
        handleOutboxChanged
      )
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [authId, cancelRetry, runSync, updateStatus])

  useEffect(() => {
    if (!authId || retryAt === undefined) return
    const timeout = window.setTimeout(
      () => {
        if (document.visibilityState !== 'visible') return
        cancelRetry()
        void runSync({ source: 'automatic' })
      },
      Math.max(0, retryAt - Date.now())
    )

    return () => window.clearTimeout(timeout)
  }, [authId, cancelRetry, retryAt, runSync])

  useEffect(() => {
    if (!authId || !navigator.storage?.persist) return
    void navigator.storage
      .persist()
      .then(setStoragePersistent)
      .catch(() => {
        setStoragePersistent(false)
      })
  }, [authId])

  useEffect(() => {
    if (!authId || !navigator.storage?.estimate) return
    void navigator.storage.estimate().then(({ usage, quota }) => {
      setStoragePressure(
        usage !== undefined && quota !== undefined && quota > 0
          ? usage / quota >= 0.8
          : false
      )
    })
  }, [authId, pendingCount])

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
