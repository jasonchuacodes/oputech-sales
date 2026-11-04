import { AlertTriangle, Cloud, RefreshCw, WifiOff } from 'lucide-react'
import { Button } from '../../../components'
import { useSyncContext } from '../../../context/sync/useSyncContext'
import { cn } from '../../../utils/cn'
import { formatTime } from '../../../utils/date'

export const SyncStatus = () => {
  const {
    status,
    pendingCount,
    progress,
    lastSyncAt,
    lastError,
    storagePersistent,
    storagePressure,
    syncNow,
  } = useSyncContext()

  const blocked = status === 'blocked'
  const offline = status === 'offline' || status === 'auth-required'
  const syncing = status === 'syncing' || status === 'checking'
  const transientSuccess =
    status === 'online' && pendingCount === 0 && !storagePressure
  const delayedActivity =
    !blocked &&
    !offline &&
    !storagePressure &&
    (syncing || pendingCount > 0)

  return (
    <div
      className={cn(
        'fixed right-4 bottom-20 z-40 flex max-w-sm items-center gap-3 rounded-md border bg-white px-3 py-2 shadow-md md:bottom-4',
        transientSuccess && 'sync-status-success',
        delayedActivity && 'sync-status-delayed',
        blocked && 'border-red-200',
        offline && 'border-amber-200'
      )}
      role="status"
    >
      {blocked ? (
        <AlertTriangle className="shrink-0 text-red-600" size={18} />
      ) : offline ? (
        <WifiOff className="shrink-0 text-amber-600" size={18} />
      ) : syncing ? (
        <RefreshCw className="shrink-0 animate-spin text-blue-600" size={18} />
      ) : (
        <Cloud className="shrink-0 text-green-600" size={18} />
      )}

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">
          {blocked
            ? 'Sync needs attention'
            : status === 'auth-required'
              ? 'Sign in to sync'
              : offline
                ? 'Working offline'
                : status === 'syncing'
                  ? `Syncing ${progress?.completed ?? 0}/${progress?.total ?? pendingCount}`
                  : status === 'checking'
                    ? 'Checking connection…'
                    : pendingCount > 0
                      ? `${pendingCount} pending`
                      : 'All changes synced'}
        </p>
        <p className="truncate text-xs text-slate-500" title={lastError}>
          {lastError ??
            (lastSyncAt
              ? `Last synced ${formatTime(lastSyncAt)}`
              : 'Not synced on this device yet')}
        </p>
        {storagePersistent === false && pendingCount > 0 && (
          <p className="text-xs text-amber-700">Browser storage is not guaranteed.</p>
        )}
        {storagePressure && (
          <p className="text-xs text-red-700">Browser storage is nearly full.</p>
        )}
      </div>

      {(pendingCount > 0 || offline || blocked) && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={syncing}
          onClick={() => void syncNow()}
        >
          {blocked ? 'Retry' : 'Sync Now'}
        </Button>
      )}
    </div>
  )
}
