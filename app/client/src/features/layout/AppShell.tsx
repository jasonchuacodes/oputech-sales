'use client'

import { useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import {
  BarChart3,
  LayoutDashboard,
  MoreHorizontal,
  Package,
  ReceiptText,
  ShoppingBag,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { useAuthContext } from '@/context/auth/useAuthContext'
import { useSyncContext } from '@/context/sync/useSyncContext'
import { UserRole } from '@/types'
import { UserStatus } from '@/services/users/users.types'
import { cn } from '@/utils/cn'
import { Spinner } from '@/components'
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
  { label: 'Home', href: '/dashboard', icon: LayoutDashboard, adminOnly: true },
  { label: 'Sell', href: '/sell', icon: ShoppingBag },
  { label: 'Activity', href: '/activity', icon: ReceiptText },
  { label: 'Reports', href: '/reports', icon: BarChart3 },
  { label: 'More', href: '/more', icon: MoreHorizontal },
]

const adminNavigation: NavItem[] = [
  { label: 'Catalog', href: '/catalog', icon: Package },
  { label: 'Users', href: '/users', icon: Users },
]

const PULL_TO_REFRESH_THRESHOLD = 56

const NavigationLink = ({
  item,
  compact = false,
  bottom = false,
}: {
  item: NavItem
  compact?: boolean
  bottom?: boolean
}) => {
  const pathname = usePathname()
  const active =
    pathname === item.href ||
    (item.href === '/reports' && pathname.startsWith('/reports/'))
  const Icon = item.icon

  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex min-h-12 items-center rounded-md text-sm font-medium transition-colors',
        bottom
          ? 'flex-col justify-center gap-1.5 rounded-none px-1 py-2 text-xs'
          : compact
            ? 'flex-col justify-center gap-1 px-1 text-xs'
            : 'gap-3 px-3',
        active
          ? bottom
            ? 'text-primary'
            : 'bg-primary/10 text-primary'
          : bottom
            ? 'text-text-tertiary hover:text-foreground'
            : 'text-text-secondary hover:bg-card hover:text-foreground'
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn(
          'shrink-0',
          bottom ? 'size-6' : 'size-5',
          active && 'stroke-[2.5]'
        )}
      />
      <span>{item.label}</span>
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

      <aside className="border-border/70 bg-card hidden w-64 shrink-0 flex-col border-r p-4 xl:flex">
        <div className="flex h-14 items-center gap-3 px-2">
          <div className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-md text-sm font-bold">
            OS
          </div>
          <div>
            <p className="font-semibold">Oputech Sales</p>
            <p className="text-text-secondary text-xs">Business operations</p>
          </div>
        </div>
        <nav
          className="mt-6 flex flex-1 flex-col gap-1"
          aria-label="Primary navigation"
        >
          {navigation
            .filter((item) => item.href !== '/more')
            .map((item) => (
              <NavigationLink key={item.href} item={item} />
            ))}
          {isAdmin && (
            <div className="border-border/70 mt-5 flex flex-col gap-1 border-t pt-5">
              <p className="text-text-tertiary px-3 pb-2 text-xs font-semibold tracking-widest uppercase">
                Manage
              </p>
              {adminNavigation.map((item) => (
                <NavigationLink key={item.href} item={item} />
              ))}
            </div>
          )}
        </nav>
        <NavigationLink item={primaryNavigation[4]} />
      </aside>

      <aside className="border-border/70 bg-card hidden w-20 shrink-0 flex-col border-r px-2 py-4 md:flex xl:hidden">
        <div className="bg-primary text-primary-foreground mx-auto flex size-11 items-center justify-center rounded-md text-sm font-bold">
          OS
        </div>
        <nav
          className="mt-6 flex flex-1 flex-col gap-2"
          aria-label="Primary navigation"
        >
          {navigation.map((item) => (
            <NavigationLink key={item.href} item={item} compact />
          ))}
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
          <Link
            href="/more"
            className="bg-primary/10 text-primary flex size-11 items-center justify-center rounded-full text-sm font-semibold"
            aria-label="Open account and settings"
          >
            {auth.username.slice(0, 1).toUpperCase()}
          </Link>
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
              'relative h-full overflow-y-auto overscroll-y-none pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0',
              isPulling
                ? 'transition-none'
                : 'transition-[top] duration-200 ease-out motion-reduce:transition-none'
            )}
            style={{ top: pullDistance }}
          >
            {children}
          </main>
        </div>
      </div>

      <nav
        aria-label="Primary navigation"
        className="bg-card fixed inset-x-0 bottom-0 z-30 pt-1 pb-[calc(0.25rem+env(safe-area-inset-bottom))] shadow-[0_-2px_10px_rgba(16,16,16,0.08)] md:hidden"
      >
        <div className="mx-auto flex max-w-lg px-2">
          {navigation.map((item) => (
            <div key={item.href} className="min-w-0 flex-1">
              <NavigationLink item={item} bottom />
            </div>
          ))}
        </div>
      </nav>

      <SyncStatus />
    </div>
  )
}
