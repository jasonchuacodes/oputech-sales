'use client'

import Link from 'next/link'
import {
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Cloud,
  LogOut,
  Package,
  RefreshCw,
  UserRound,
  Users,
  WifiOff,
} from 'lucide-react'
import { Button } from '@/components'
import { useAuthContext } from '@/context/auth/useAuthContext'
import { useSyncContext } from '@/context/sync/useSyncContext'
import { useUpdateActivityStatus } from '@/services/users/users.queries'
import { UserStatus } from '@/services/users/users.types'
import { UserRole } from '@/types'
import { formatTime } from '@/utils/date'
import { AccountAvatar } from './components/AccountAvatar'

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
  const updateStatus = useUpdateActivityStatus()
  const isAdmin = auth?.role === UserRole.ADMIN
  const isActive = auth?.activityStatus.status === UserStatus.Active

  const setStatus = (status: UserStatus, message?: string) => {
    if (!auth?.id) return
    updateStatus.mutate({ id: auth.id, input: { status, message } })
  }

  const SyncIcon =
    sync.status === 'online'
      ? Cloud
      : sync.status === 'syncing'
        ? RefreshCw
        : WifiOff

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-5 md:p-6">
      <section className="rounded-card bg-card flex items-center gap-4 p-4 shadow-xs">
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
            {isAdmin ? 'Administrator' : 'Sales user'}
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold tracking-[0.16em] uppercase">
          Work status
        </h2>
        <div className="rounded-card bg-card flex flex-col gap-4 p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <CheckCircle2
              className={
                isActive ? 'text-status-success' : 'text-text-tertiary'
              }
            />
            <div className="flex-1">
              <p className="font-semibold">
                {isActive
                  ? 'Active'
                  : (auth?.activityStatus.message ?? 'Inactive')}
              </p>
              <p className="text-text-secondary text-sm">
                Inactive users must go active before using the app.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              className="h-12 flex-1"
              variant={isActive ? 'outline' : 'default'}
              onClick={() => setStatus(UserStatus.Active)}
            >
              Go active
            </Button>
            <Button
              className="h-12 flex-1"
              variant={!isActive ? 'outline' : 'secondary'}
              onClick={() => setStatus(UserStatus.Inactive, 'On Break')}
            >
              Take a break
            </Button>
          </div>
        </div>
      </section>

      {isAdmin && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold tracking-[0.16em] uppercase">
            Manage
          </h2>
          <div className="rounded-card bg-card overflow-hidden shadow-xs">
            <ManagementLink
              href="/catalog"
              icon={Package}
              title="Product catalog"
              description="Manage products, pricing, and images"
            />
            <ManagementLink
              href="/users"
              icon={Users}
              title="Users"
              description="Manage access, roles, and passwords"
            />
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
        <div className="rounded-card bg-card flex flex-col gap-4 p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <SyncIcon
              className={
                sync.status === 'syncing'
                  ? 'text-primary animate-spin'
                  : 'text-primary'
              }
            />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                {sync.status === 'online'
                  ? 'All changes synced'
                  : sync.status === 'syncing'
                    ? 'Syncing changes'
                    : 'Working offline'}
              </p>
              <p className="text-text-secondary truncate text-sm">
                {sync.lastError ??
                  (sync.lastSyncAt
                    ? `Last synced ${formatTime(sync.lastSyncAt)}`
                    : 'Not synced on this device yet')}
              </p>
            </div>
          </div>
          {(sync.pendingCount > 0 || sync.status !== 'online') && (
            <Button
              className="h-12 w-full"
              variant="outline"
              onClick={() => void sync.syncNow()}
            >
              Sync now{sync.pendingCount ? ` (${sync.pendingCount})` : ''}
            </Button>
          )}
        </div>
      </section>

      <Button className="h-12 w-full gap-2" variant="outline" onClick={logout}>
        <LogOut className="size-5" />
        Sign out
      </Button>

      <div className="text-text-tertiary flex items-center justify-center gap-2 pb-4 text-xs">
        <UserRound className="size-4" /> Oputech Sales
      </div>
    </div>
  )
}
