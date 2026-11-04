'use client'

import { useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import {
  BarChart3,
  Bell,
  House,
  Package,
  ReceiptText,
  ShoppingBag,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { useAuthContext } from '@/context/auth/useAuthContext'
import { useSyncContext } from '@/context/sync/useSyncContext'
import { UserRole } from '@/types'
import { UserStatus } from '@/services/users/users.types'
import { cn } from '@/utils/cn'
import { Button, Spinner } from '@/components'
import { AccountAvatar } from '@/features/account/components/AccountAvatar'
import { StatusOverlay } from './components/StatusOverlay'
import { SyncStatus } from './components/SyncStatus'
import { PullToRefreshIndicator } from './components/PullToRefreshIndicator'
import { useCurrentUserActivityStatus } from './hooks/useCurrentUserActivityStatus'
import { usePullToRefresh } from './hooks/usePullToRefresh'

type NavItem = {
  label: string
  href: string
  icon: LucideIcon
  adminOnly?: boolean
}

const primaryNavigation: NavItem[] = [
  { label: 'Home', href: '/dashboard', icon: House, adminOnly: true },
  { label: 'Sell', href: '/sell', icon: ShoppingBag },
  { label: 'Activity', href: '/activity', icon: ReceiptText },
  { label: 'Reports', href: '/reports', icon: BarChart3 },
]

const adminNavigation: NavItem[] = [
  { label: 'Catalog', href: '/catalog', icon: Package },
  { label: 'Users', href: '/users', icon: Users },
]

const accountNavigation: NavItem = {
  label: 'Me',
  href: '/account',
  icon: UserRound,
}

const PULL_TO_REFRESH_THRESHOLD = 56

const isRouteActive = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`)

const NavigationLink = ({
  item,
  bottom = false,
}: {
  item: NavItem
  bottom?: boolean
}) => {
  const pathname = usePathname()
  const active = isRouteActive(pathname, item.href)
  const Icon = item.icon

  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'focus-visible:ring-ring/30 flex items-center rounded-md text-sm font-medium transition-colors outline-none focus-visible:ring-3',
        bottom
          ? 'min-h-16 flex-col justify-center gap-1 rounded-none px-1 py-2 text-xs'
          : 'min-h-12 gap-3 px-2 py-3',
        active
          ? bottom
            ? 'text-primary'
            : 'bg-primary/10 text-primary'
          : bottom
            ? 'text-text-tertiary hover:text-text-secondary'
            : 'text-text-secondary hover:bg-surface-hover hover:text-foreground'
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn(
          'shrink-0',
          bottom ? 'size-6' : 'size-5',
          active && 'stroke-[2.5]',
          active && item.href === '/dashboard' && 'fill-primary'
        )}
      />
      <span>{item.label}</span>
    </Link>
  )
}

const AccountProfileLink = ({
  username,
  email,
  isAdmin,
}: {
  username: string
  email: string
  isAdmin: boolean
}) => {
  const pathname = usePathname()
  const active = isRouteActive(pathname, accountNavigation.href)

  return (
    <Link
      href={accountNavigation.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'focus-visible:ring-ring/30 flex min-h-16 items-center gap-3 rounded-md px-2 py-2 transition-colors outline-none focus-visible:ring-3',
        active
          ? 'bg-primary/10 text-primary'
          : 'text-text-secondary hover:bg-surface-hover hover:text-foreground'
      )}
    >
      <AccountAvatar
        username={username}
        className={cn(!active && 'bg-muted text-text-secondary')}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">
          {username || 'Account'}
        </span>
        <span className="text-text-tertiary block truncate text-xs">
          {email || (isAdmin ? 'Administrator' : 'Sales user')}
        </span>
      </span>
    </Link>
  )
}

export const AppShell = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname()
  const router = useRouter()
  const queryClient = useQueryClient()
  const mainRef = useRef<HTMLElement>(null)
  const { auth, loading } = useAuthContext()
  const { status: connectivityStatus, syncNow } = useSyncContext()
  const { status, setActive } = useCurrentUserActivityStatus()
  const isAdmin = auth?.role === UserRole.ADMIN

  useEffect(() => {
    if (loading) return
    if (!auth) {
      router.replace('/login')
      return
    }
    if (
      !isAdmin &&
      ['/dashboard', '/catalog', '/users'].some((path) =>
        pathname.startsWith(path)
      )
    ) {
      router.replace('/sell')
    }
  }, [auth, isAdmin, loading, pathname, router])

  const handleRefresh = useCallback(async () => {
    await syncNow()
    await queryClient.invalidateQueries()
  }, [queryClient, syncNow])

  const { pullDistance, isPulling, isRefreshing } = usePullToRefresh(
    mainRef,
    handleRefresh,
    {
      threshold: PULL_TO_REFRESH_THRESHOLD,
      enabled: !loading && !!auth,
    }
  )

  const navigation = useMemo(
    () => primaryNavigation.filter((item) => !item.adminOnly || isAdmin),
    [isAdmin]
  )

  if (loading || !auth) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="bg-background flex h-dvh overflow-hidden">
      <StatusOverlay
        open={status === UserStatus.Inactive && connectivityStatus === 'online'}
        onActive={setActive}
      />

      <aside className="border-border/70 bg-card hidden w-48 shrink-0 flex-col gap-6 border-r px-2 py-4 md:flex xl:w-64 xl:px-4">
        <div className="flex h-14 shrink-0 items-center justify-center xl:justify-start xl:gap-3 xl:px-2">
          <div className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-md text-sm font-bold">
            OS
          </div>
          <div className="hidden xl:block">
            <p className="font-semibold">Oputech Sales</p>
            <p className="text-text-secondary text-xs">Business operations</p>
          </div>
        </div>
        <nav
          className="flex min-h-0 flex-1 flex-col gap-4"
          aria-label="Primary navigation"
        >
          <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
            {navigation.map((item) => (
              <NavigationLink key={item.href} item={item} />
            ))}
            {isAdmin && (
              <div className="border-border/70 flex flex-col gap-1 border-t pt-4">
                <p className="text-text-tertiary px-2 py-2 text-xs font-semibold tracking-widest uppercase">
                  Manage
                </p>
                {adminNavigation.map((item) => (
                  <NavigationLink key={item.href} item={item} />
                ))}
              </div>
            )}
          </div>
          <AccountProfileLink
            username={auth.username}
            email={auth.email}
            isAdmin={isAdmin}
          />
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-border/60 bg-background/95 flex h-16 shrink-0 items-center justify-between border-b px-5 backdrop-blur md:hidden">
          <div className="flex items-center gap-3">
            <span className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-md text-xs font-bold">
              OS
            </span>
            <h1 className="text-lg font-semibold">Oputech Sales</h1>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled
            aria-label="Notifications coming soon"
            title="Notifications coming soon"
          >
            <Bell className="size-5" aria-hidden="true" />
          </Button>
        </header>

        <div className="relative min-h-0 flex-1 overflow-hidden">
          <PullToRefreshIndicator
            pullDistance={pullDistance}
            isPulling={isPulling}
            isRefreshing={isRefreshing}
            threshold={PULL_TO_REFRESH_THRESHOLD}
            height={PULL_TO_REFRESH_THRESHOLD}
          />
          <main
            ref={mainRef}
            aria-busy={isRefreshing}
            className={cn(
              'relative h-full overflow-y-auto overscroll-y-none',
              isPulling
                ? 'transition-none'
                : 'transition-[top] duration-200 ease-out motion-reduce:transition-none'
            )}
            style={{ top: pullDistance }}
          >
            {children}
          </main>
        </div>

        <nav
          aria-label="Primary navigation"
          className="bg-card z-30 shrink-0 pt-1 pb-[calc(0.25rem+env(safe-area-inset-bottom))] shadow-[0_-2px_10px_rgba(16,16,16,0.08)] md:hidden"
        >
          <div className="mx-auto flex w-full max-w-lg px-1">
            {[...navigation, accountNavigation].map((item) => (
              <div key={item.href} className="min-w-0 flex-1">
                <NavigationLink item={item} bottom />
              </div>
            ))}
          </div>
        </nav>
      </div>

      <SyncStatus />
    </div>
  )
}
