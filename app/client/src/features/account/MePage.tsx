'use client'

import Link from 'next/link'
import { ChevronRight, LogOut } from 'lucide-react'
import { Button, ContentSection } from '@/components'
import { useAuthContext } from '@/context/auth/useAuthContext'
import { useSyncContext } from '@/context/sync/useSyncContext'
import { UserRole } from '@/types'
import { formatTime } from '@/utils/date'
import { AccountAvatar } from './components/AccountAvatar'
import { TenantSelector } from './components/TenantSelector'

const ManagementLink = ({
  href,
  title,
  description,
}: {
  href: string
  title: string
  description: string
}) => (
  <Link
    href={href}
    className="border-border/60 flex min-h-14 items-center gap-3 border-b px-3 py-2.5 last:border-b-0"
  >
    <span className="min-w-0 flex-1">
      <span className="text-text-heading block font-medium">{title}</span>
      <span className="text-text-tertiary block text-sm">{description}</span>
    </span>
    <ChevronRight className="text-text-tertiary size-5" />
  </Link>
)

export const MePage = () => {
  const { auth, logout } = useAuthContext()
  const sync = useSyncContext()
  const isSuperAdmin = auth?.role === UserRole.SUPERADMIN
  const isAdmin = auth?.role === UserRole.ADMIN || isSuperAdmin
  const displayName = auth?.fullName || auth?.username || 'Account'

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
              : 'Device is up to date'

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-5 py-5 md:p-6">
      {isAdmin ? (
        <Link
          href="/account"
          aria-label="Open account settings"
          className="rounded-card bg-card shadow-card hover:bg-surface-hover focus-visible:ring-ring/30 flex items-center gap-4 p-4 transition-colors outline-none focus-visible:ring-3"
        >
          <AccountAvatar
            username={displayName}
            className="size-14 text-lg"
            iconClassName="size-6"
          />
          <div className="min-w-0 flex-1">
            <h2 className="text-text-heading text-card-title truncate font-medium">
              {displayName}
            </h2>
            <p className="text-text-tertiary text-sm">
              {isSuperAdmin ? 'Super administrator' : 'Administrator'}
            </p>
          </div>
          <ChevronRight className="text-text-tertiary size-5 shrink-0" />
        </Link>
      ) : (
        <section className="rounded-card bg-card shadow-card flex items-center gap-4 p-4">
          <AccountAvatar
            username={displayName}
            className="size-14 text-lg"
            iconClassName="size-6"
          />
          <div className="min-w-0">
            <h2 className="text-text-heading text-card-title truncate font-medium">
              {displayName}
            </h2>
            <p className="text-text-tertiary text-sm">Staff</p>
          </div>
        </section>
      )}

      <ContentSection label="Tenant">
        <TenantSelector />
      </ContentSection>

      {isAdmin && (
        <ContentSection label="Manage">
          <div className="rounded-card bg-card shadow-card overflow-hidden">
            <ManagementLink
              href="/products"
              title="Products"
              description="Manage products, pricing, stock, and movement history"
            />
            {isSuperAdmin && (
              <ManagementLink
                href="/users"
                title="Users"
                description="Manage access, roles, and tenant assignments"
              />
            )}
            <ManagementLink
              href="/dashboard"
              title="Analytics"
              description="Review sales and expense performance"
            />
          </div>
        </ContentSection>
      )}

      <ContentSection label="Device">
        <div className="rounded-card bg-card shadow-card flex flex-col gap-3 p-3">
          <div className="min-w-0">
            <p className="text-text-heading font-medium">{syncTitle}</p>
            <p className="text-text-tertiary truncate text-sm">
              {sync.lastError ??
                (sync.lastSyncAt
                  ? `Last refreshed ${formatTime(sync.lastSyncAt)}`
                  : 'Not refreshed on this device yet')}
            </p>
            {sync.storagePersistent === false && sync.pendingCount > 0 && (
              <p className="text-status-warning text-sm">
                Browser storage is not guaranteed. Sync pending changes soon.
              </p>
            )}
            {sync.storagePressure && (
              <p className="text-status-error text-sm">
                Browser storage is nearly full.
              </p>
            )}
            {sync.otherUserPendingCount > 0 && (
              <p className="text-text-tertiary text-sm">
                {sync.otherUserPendingCount}{' '}
                {sync.otherUserPendingCount === 1 ? 'change is' : 'changes are'}{' '}
                waiting for another user.
              </p>
            )}
          </div>
          <Button
            className="w-full"
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
      </ContentSection>

      <Button className="w-full gap-2" variant="outline" onClick={logout}>
        <LogOut className="size-5 md:size-4" />
        Sign out
      </Button>
    </div>
  )
}
