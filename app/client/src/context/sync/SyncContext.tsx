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
import { useAuthContext } from '../auth/useAuthContext'
import {
  adoptLegacyOfflineData,
  getLastSyncAt,
  getSnapshotRefreshNeeded,
  offlineDb,
  setSnapshotRefreshNeeded,
} from '../../offline/database'
import { flushOutbox, probeApi, SyncFailure } from '../../offline/sync'
import { useTenantContext } from '../tenant/useTenantContext'
import {
  SyncContext,
  type Reachability,
  type SyncContextValue,
  type SyncPhase,
} from './sync-context'

const AUTOMATIC_RETRY_MS = 5 * 60 * 1000
const SNAPSHOT_STALE_MS = 5 * 60 * 1000

interface SyncRequest {
  source: 'automatic' | 'bootstrap' | 'manual' | 'reconnect'
  refreshSnapshot?: boolean
  refreshIfStale?: boolean
  retryBlocked?: boolean
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
  refreshIfStale: current?.refreshIfStale || next.refreshIfStale,
  retryBlocked: current?.retryBlocked || next.retryBlocked,
})

const isSnapshotStale = (syncedAt?: string) =>
  !syncedAt || Date.now() - new Date(syncedAt).getTime() >= SNAPSHOT_STALE_MS

export const SyncProvider = ({ children }: { children: ReactNode }) => {
  const { auth } = useAuthContext()
  const { currentTenant } = useTenantContext()
  const authId = auth?.id
  const tenantId = currentTenant?.id ?? auth?.currentTenantId
  const running = useRef<Promise<void> | null>(null)
  const queuedRequest = useRef<SyncRequest | null>(null)
  const runSyncRef = useRef<(request: SyncRequest) => Promise<void>>(async () =>
    Promise.resolve()
  )
  const retryAtRef = useRef<number | undefined>(undefined)
  const observedPendingCount = useRef<number | undefined>(undefined)
  const [reachability, setReachability] =
    useState<Reachability>('unknown')
  const [phase, setPhase] = useState<SyncPhase>('idle')
  const [authRequired, setAuthRequired] = useState(false)
  const [statsReady, setStatsReady] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [blockedCount, setBlockedCount] = useState(0)
  const [otherUserPendingCount, setOtherUserPendingCount] = useState(0)
  const [progress, setProgress] = useState<SyncContextValue['progress']>()
  const [lastSyncAt, setLastSyncAtState] = useState<string>()
  const [lastError, setLastError] = useState<string>()
  const [storagePersistent, setStoragePersistent] = useState<boolean>()
  const [storagePressure, setStoragePressure] = useState<boolean>()
  const [retryAt, setRetryAt] = useState<number>()

  const refreshStats = useCallback(async () => {
    const [allOperations, syncedAt, snapshotRefreshNeeded] = await Promise.all([
      offlineDb.outbox.toArray(),
      getLastSyncAt(tenantId),
      getSnapshotRefreshNeeded(tenantId),
    ])
    const tenantOperations = tenantId
      ? allOperations.filter((operation) => operation.tenantId === tenantId)
      : []
    const currentOperations = authId && tenantId
      ? tenantOperations.filter((operation) => operation.ownerUserId === authId)
      : []
    const pending = currentOperations.length
    const blocked = currentOperations.filter(
      (operation) => operation.state === 'blocked'
    ).length
    const otherPending = tenantOperations.length - pending

    setPendingCount(pending)
    setBlockedCount(blocked)
    setOtherUserPendingCount(otherPending)
    setLastSyncAtState(syncedAt)
    setStatsReady(true)
    return {
      pending,
      blocked,
      syncedAt,
      snapshotRefreshNeeded: !!snapshotRefreshNeeded,
    }
  }, [authId, tenantId])

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
        if (authId && tenantId) {
          await adoptLegacyOfflineData(authId, tenantId)
        }
        const statsAtStart = await refreshStats()
        const refreshSnapshot =
          !!request.refreshSnapshot ||
          !!statsAtStart.snapshotRefreshNeeded ||
          (!!request.refreshIfStale && isSnapshotStale(statsAtStart.syncedAt))

        if (refreshSnapshot && tenantId) {
          await setSnapshotRefreshNeeded(true, tenantId)
        }

        const hasWork =
          statsAtStart.pending > 0 ||
          refreshSnapshot ||
          !!request.retryBlocked
        setLastError(undefined)

        if (!authId || !tenantId) {
          setPhase('idle')
          return
        }

        if (!manual && navigator.onLine === false) {
          setReachability('unreachable')
          if (hasWork) {
            setPhase('backoff')
            scheduleRetry()
          }
          return
        }

        setPhase('checking')
        if (!(await probeApi())) {
          setReachability('unreachable')
          setPhase(hasWork ? 'backoff' : 'idle')
          if (hasWork) scheduleRetry()
          return
        }

        setReachability('reachable')
        setAuthRequired(false)
        if (!hasWork) {
          setPhase('idle')
          cancelRetry()
          return
        }

        setPhase('syncing')
        try {
          const result = await flushOutbox({
            ownerUserId: authId,
            tenantId,
            force: manual,
            refreshSnapshot,
            retryBlocked: request.retryBlocked,
            onProgress: (completed, total) =>
              setProgress({ completed, total }),
          })
          setReachability('reachable')
          setPhase('idle')

          const stats = await refreshStats()
          if (
            result.status === 'synced' &&
            stats.pending === 0 &&
            !stats.snapshotRefreshNeeded
          ) {
            cancelRetry()
          } else if (
            stats.pending === stats.blocked &&
            !stats.snapshotRefreshNeeded
          ) {
            setPhase('idle')
            cancelRetry()
          } else {
            setPhase('backoff')
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
          if (failure.kind === 'auth') {
            setAuthRequired(true)
            setPhase('idle')
          } else if (failure.kind === 'network') {
            setReachability('unreachable')
            setPhase('backoff')
            scheduleRetry()
          } else {
            setPhase('idle')
          }
        } finally {
          setProgress(undefined)
          await refreshStats()
        }
      })().catch(async (error) => {
        setProgress(undefined)
        setPhase('idle')
        setLastError(
          error instanceof Error
            ? error.message
            : 'Local synchronization failed'
        )
        try {
          await refreshStats()
        } catch {
          // Keep the actionable storage error visible.
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
    [authId, tenantId, cancelRetry, refreshStats, scheduleRetry]
  )

  useEffect(() => {
    runSyncRef.current = runSync
  }, [runSync])

  const syncNow = useCallback(
    () => runSync({ source: 'manual', refreshSnapshot: true }),
    [runSync]
  )

  const refreshInBackground = useCallback(
    () => runSync({ source: 'automatic', refreshSnapshot: true }),
    [runSync]
  )

  const retryBlocked = useCallback(
    () => runSync({ source: 'manual', retryBlocked: true }),
    [runSync]
  )

  useEffect(() => {
    observedPendingCount.current = undefined
    const subscription = liveQuery(async () => {
      const [operations, syncedAt, snapshotRefreshNeeded] = await Promise.all([
        offlineDb.outbox.toArray(),
        getLastSyncAt(tenantId),
        getSnapshotRefreshNeeded(tenantId),
      ])
      const tenantOperations = tenantId
        ? operations.filter((operation) => operation.tenantId === tenantId)
        : []
      const current = authId && tenantId
        ? tenantOperations.filter((operation) => operation.ownerUserId === authId)
        : []
      return {
        pending: current.length,
        blocked: current.filter((operation) => operation.state === 'blocked')
          .length,
        otherPending: tenantOperations.length - current.length,
        syncedAt,
        snapshotRefreshNeeded: !!snapshotRefreshNeeded,
      }
    }).subscribe(
      ({
        pending,
        blocked,
        otherPending,
        syncedAt,
        snapshotRefreshNeeded,
      }) => {
        setPendingCount(pending)
        setBlockedCount(blocked)
        setOtherUserPendingCount(otherPending)
        setLastSyncAtState(syncedAt)
        setStatsReady(true)
        if (pending === 0 && !snapshotRefreshNeeded) cancelRetry()
        if (
          authId && tenantId &&
          observedPendingCount.current !== undefined &&
          pending > observedPendingCount.current
        ) {
          queueMicrotask(() =>
            void runSyncRef.current({ source: 'automatic' })
          )
        }
        observedPendingCount.current = pending
      },
      (error) => {
        setStatsReady(false)
        setLastError(
          error instanceof Error ? error.message : 'Browser storage unavailable'
        )
      }
    )
    return () => subscription.unsubscribe()
  }, [authId, tenantId, cancelRetry])

  useEffect(() => {
    if (!authId || !tenantId) {
      queuedRequest.current = null
      retryAtRef.current = undefined
      queueMicrotask(() => {
        setAuthRequired(false)
        setPhase('idle')
        cancelRetry()
      })
      return
    }
    void runSync({ source: 'bootstrap', refreshIfStale: true })

    const handleReconnect = () =>
      void runSync({ source: 'reconnect', refreshIfStale: true })
    const handleOffline = () => setReachability('unreachable')
    const handleOutboxChanged = () => void runSync({ source: 'automatic' })
    const handleVisibility = () => {
      if (
        document.visibilityState === 'visible' &&
        retryAtRef.current !== undefined &&
        retryAtRef.current <= Date.now()
      ) {
        cancelRetry()
        void runSync({ source: 'automatic', refreshIfStale: true })
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
  }, [authId, tenantId, cancelRetry, runSync])

  useEffect(() => {
    if (!authId || !tenantId || retryAt === undefined) return
    const timeout = window.setTimeout(
      () => {
        if (document.visibilityState !== 'visible') return
        cancelRetry()
        void runSync({ source: 'automatic', refreshIfStale: true })
      },
      Math.max(0, retryAt - Date.now())
    )
    return () => window.clearTimeout(timeout)
  }, [authId, tenantId, cancelRetry, retryAt, runSync])

  useEffect(() => {
    if (!authId || !navigator.storage?.persist) return
    void navigator.storage
      .persist()
      .then(setStoragePersistent)
      .catch(() => setStoragePersistent(false))
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

  const canUseQueueSensitiveFeatures =
    statsReady &&
    reachability === 'reachable' &&
    !authRequired &&
    phase === 'idle' &&
    pendingCount === 0 &&
    blockedCount === 0

  const value = useMemo<SyncContextValue>(
    () => ({
      reachability,
      phase,
      authRequired,
      statsReady,
      isSyncing: phase === 'checking' || phase === 'syncing',
      pendingCount,
      blockedCount,
      otherUserPendingCount,
      progress,
      lastSyncAt,
      lastError,
      storagePersistent,
      storagePressure,
      canGenerateReport: canUseQueueSensitiveFeatures,
      canModifyCatalog: canUseQueueSensitiveFeatures,
      syncNow,
      refreshInBackground,
      retryBlocked,
    }),
    [
      reachability,
      phase,
      authRequired,
      statsReady,
      pendingCount,
      blockedCount,
      otherUserPendingCount,
      progress,
      lastSyncAt,
      lastError,
      storagePersistent,
      storagePressure,
      canUseQueueSensitiveFeatures,
      syncNow,
      refreshInBackground,
      retryBlocked,
    ]
  )

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>
}
