'use client'

import Link from 'next/link'
import {
  AlertTriangle,
  BarChart3,
  ChevronRight,
  Cloud,
  LogOut,
  Package,
  RefreshCw,
  Users,
  WifiOff,
} from 'lucide-react'
import { Button } from '@/components'
import { useAuthContext } from '@/context/auth/useAuthContext'
import { useSyncContext } from '@/context/sync/useSyncContext'
import { UserRole } from '@/types'
import { formatTime } from '@/utils/date'
import { AccountAvatar } from './components/AccountAvatar'
import { TenantSelector } from './components/TenantSelector'

const ManagementLink = ({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string
  icon: typeof Package
  title: string
  description: string
}) => (
  <Link
    href={href}
    className="border-border/60 flex min-h-18 items-center gap-4 border-b px-4 py-3 last:border-b-0"
  >
    <span className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-full">
      <Icon className="size-5" />
    </span>
    <span className="min-w-0 flex-1">
      <span className="block font-semibold">{title}</span>
      <span className="text-text-secondary block text-sm">{description}</span>
    </span>
    <ChevronRight className="text-text-tertiary size-5" />
  </Link>
)

export const AccountPage = () => {
  const { auth, logout } = useAuthContext()
  const sync = useSyncContext()
  const isSuperAdmin = auth?.role === UserRole.SUPERADMIN
  const isAdmin = auth?.role === UserRole.ADMIN || isSuperAdmin

  const SyncIcon =
    sync.blockedCount > 0
      ? AlertTriangle
      : sync.reachability === 'reachable' && !sync.isSyncing
        ? Cloud
        : sync.isSyncing
          ? RefreshCw
          : WifiOff
  const syncBusy = sync.isSyncing
  const syncTitle =
    sync.blockedCount > 0
      ? `${sync.blockedCount || sync.pendingCount} changes need attention`
      : sync.authRequired
        ? 'Sign in to sync'
        : sync.reachability === 'unreachable'
          ? 'Working offline'
          : syncBusy
            ? 'Syncing changes'
            : sync.pendingCount > 0
              ? `${sync.pendingCount} changes pending`
              : 'No pending changes'

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-5 md:p-6">
      <section className="rounded-card bg-card flex items-center gap-4 p-4 shadow-card">
        <AccountAvatar
          username={auth?.username}
          className="size-14 text-xl"
          iconClassName="size-6"
        />
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold">
            {auth?.username || 'Account'}
          </h2>
          <p className="text-text-secondary text-sm">
            {isSuperAdmin ? 'Super administrator' : isAdmin ? 'Administrator' : 'Staff'}
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold tracking-[0.16em] uppercase">
          Tenant
        </h2>
        <TenantSelector />
      </section>

      {isAdmin && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold tracking-[0.16em] uppercase">
            Manage
          </h2>
          <div className="rounded-card bg-card overflow-hidden shadow-card">
            <ManagementLink
              href="/catalog"
              icon={Package}
              title="Product catalog"
              description="Manage products, pricing, and images"
            />
            {isSuperAdmin && (
              <ManagementLink
                href="/users"
                icon={Users}
                title="Users"
                description="Manage access, roles, and tenant assignments"
              />
            )}
            <ManagementLink
              href="/dashboard"
              icon={BarChart3}
              title="Analytics"
              description="Review sales and expense performance"
            />
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold tracking-[0.16em] uppercase">
          Device
        </h2>
        <div className="rounded-card bg-card flex flex-col gap-4 p-4 shadow-card">
          <div className="flex items-center gap-3">
            <SyncIcon
              className={
                syncBusy
                  ? 'text-primary animate-spin'
                    : sync.blockedCount > 0
                      ? 'text-status-error'
                    : 'text-primary'
              }
            />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{syncTitle}</p>
              <p className="text-text-secondary truncate text-sm">
                {sync.lastError ??
                  (sync.lastSyncAt
                    ? `Last refreshed ${formatTime(sync.lastSyncAt)}`
                    : 'Not refreshed on this device yet')}
              </p>
            </div>
          </div>
          <Button
            className="h-12 w-full"
            variant="outline"
            disabled={syncBusy || sync.authRequired}
            onClick={() =>
              void (sync.blockedCount > 0
                ? sync.retryBlocked()
                : sync.syncNow())
            }
          >
            {sync.blockedCount > 0 ? 'Retry blocked changes' : 'Sync now'}
            {sync.pendingCount ? ` (${sync.pendingCount})` : ''}
          </Button>
        </div>
      </section>

      <Button className="h-12 w-full gap-2" variant="outline" onClick={logout}>
        <LogOut className="size-5" />
        Sign out
      </Button>
    </div>
  )
}
