'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import {
  BarChart3,
  Bell,
  Building2,
  House,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  ReceiptText,
  ShoppingBag,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { useAuthContext } from '@/context/auth/useAuthContext'
import { useSyncContext } from '@/context/sync/useSyncContext'
import { UserRole } from '@/types'
import { cn } from '@/utils/cn'
import { Button, Spinner } from '@/components'
import { AccountAvatar } from '@/features/account/components/AccountAvatar'
import { SyncStatus } from './components/SyncStatus'
import { PullToRefreshIndicator } from './components/PullToRefreshIndicator'
import { SidebarTenantSwitcher } from './components/SidebarTenantSwitcher'
import { usePullToRefresh } from './hooks/usePullToRefresh'
import { useTenantContext } from '@/context/tenant/useTenantContext'
import { PublicRoutes, UserRoutes } from '@/routes/paths'

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
  { label: 'Tenants', href: '/tenants', icon: Building2 },
  { label: 'Users', href: '/users', icon: Users },
]

const accountNavigation: NavItem = {
  label: 'Me',
  href: '/account',
  icon: UserRound,
}

const PULL_TO_REFRESH_THRESHOLD = 56
const SIDEBAR_COLLAPSED_STORAGE_KEY = 'oputech-sales:sidebar-collapsed'
let sidebarCollapsedFallback = false
const sidebarPreferenceListeners = new Set<() => void>()

const getSidebarCollapsedSnapshot = () => {
  try {
    const storedPreference = window.localStorage.getItem(
      SIDEBAR_COLLAPSED_STORAGE_KEY
    )

    return storedPreference === null
      ? sidebarCollapsedFallback
      : storedPreference === 'true'
  } catch {
    return sidebarCollapsedFallback
  }
}

const getServerSidebarCollapsedSnapshot = () => false

const subscribeToSidebarPreference = (onChange: () => void) => {
  sidebarPreferenceListeners.add(onChange)

  const handleStorage = (event: StorageEvent) => {
    if (event.key === SIDEBAR_COLLAPSED_STORAGE_KEY) onChange()
  }

  window.addEventListener('storage', handleStorage)

  return () => {
    sidebarPreferenceListeners.delete(onChange)
    window.removeEventListener('storage', handleStorage)
  }
}

const setSidebarCollapsedPreference = (collapsed: boolean) => {
  sidebarCollapsedFallback = collapsed

  try {
    window.localStorage.setItem(
      SIDEBAR_COLLAPSED_STORAGE_KEY,
      String(collapsed)
    )
  } catch {
    // Keep the preference in memory when browser storage is unavailable.
  }

  sidebarPreferenceListeners.forEach((listener) => listener())
}

const isRouteActive = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`)

const NavigationLink = ({
  item,
  bottom = false,
  collapsed = false,
}: {
  item: NavItem
  bottom?: boolean
  collapsed?: boolean
}) => {
  const pathname = usePathname()
  const active = isRouteActive(pathname, item.href)
  const Icon = item.icon

  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      title={collapsed && !bottom ? item.label : undefined}
      className={cn(
        'focus-visible:ring-ring/30 flex items-center rounded-sm text-sm font-medium transition-colors outline-none focus-visible:ring-3',
        bottom
          ? 'min-h-16 flex-col justify-center gap-1 rounded-none px-1 py-2 text-xs'
          : 'min-h-10 gap-2 px-1.5 py-1',
        collapsed && !bottom && 'justify-center gap-0 px-0',
        active
          ? bottom
            ? 'text-primary'
            : 'bg-primary/10 text-primary'
          : bottom
            ? 'text-text-tertiary hover:text-text-secondary'
            : 'text-text-secondary hover:bg-surface-hover hover:text-foreground'
      )}
    >
      <span
        className={cn(
          'flex shrink-0 items-center justify-center',
          bottom ? 'size-6' : 'size-7'
        )}
      >
        <Icon
          aria-hidden="true"
          strokeWidth={bottom ? (active ? 2 : 1.75) : 2}
          className={bottom ? 'size-6' : 'size-5'}
        />
      </span>
      <span className={cn(collapsed && !bottom && 'sr-only')}>
        {item.label}
      </span>
    </Link>
  )
}

const AccountProfileLink = ({
  username,
  email,
  isAdmin,
  collapsed = false,
}: {
  username: string
  email: string
  isAdmin: boolean
  collapsed?: boolean
}) => {
  const pathname = usePathname()
  const active = isRouteActive(pathname, accountNavigation.href)

  return (
    <Link
      href={accountNavigation.href}
      aria-current={active ? 'page' : undefined}
      aria-label={collapsed ? accountNavigation.label : undefined}
      title={collapsed ? accountNavigation.label : undefined}
      className={cn(
        'focus-visible:ring-ring/30 flex items-center rounded-sm transition-colors outline-none focus-visible:ring-3',
        collapsed
          ? 'min-h-10 justify-center px-0 py-1'
          : 'min-h-12 gap-2 px-1.5 py-1',
        active
          ? 'bg-primary/10 text-primary'
          : 'text-text-secondary hover:bg-surface-hover hover:text-foreground'
      )}
    >
      <AccountAvatar
        username={username}
        className={cn(
          'size-8 text-xs',
          !active && 'bg-muted text-text-secondary'
        )}
        iconClassName="size-5"
      />
      <span className={cn('min-w-0 flex-1', collapsed && 'sr-only')}>
        <span className="block truncate text-sm font-medium">
          {username || 'Account'}
        </span>
        <span className="text-text-tertiary block truncate text-xs">
          {email || (isAdmin ? 'Administrator' : 'Staff')}
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
  const isSidebarCollapsed = useSyncExternalStore(
    subscribeToSidebarPreference,
    getSidebarCollapsedSnapshot,
    getServerSidebarCollapsedSnapshot
  )
  const { auth, loading } = useAuthContext()
  const { syncNow } = useSyncContext()
  const tenant = useTenantContext()
  const isSuperAdmin = auth?.role === UserRole.SUPERADMIN
  const isAdmin = auth?.role === UserRole.ADMIN || isSuperAdmin

  useEffect(() => {
    if (loading) return
    if (!auth) {
      router.replace(PublicRoutes.Login)
      return
    }
    if (!auth.currentTenantId) {
      router.replace(UserRoutes.Onboarding)
      return
    }
    if (
      !isAdmin &&
      ['/dashboard', '/catalog', '/tenants'].some((path) =>
        pathname.startsWith(path)
      )
    ) {
      router.replace('/sell')
    }
    if (!isSuperAdmin && pathname.startsWith('/users')) {
      router.replace('/sell')
    }
  }, [auth, isAdmin, isSuperAdmin, loading, pathname, router])

  const handleRefresh = useCallback(async () => {
    await Promise.allSettled([
      syncNow(),
      queryClient.refetchQueries({
        type: 'active',
        predicate: (query) =>
          ['reports', 'report', 'analytics', 'users', 'tenants'].includes(
            String(query.queryKey[0])
          ),
      }),
    ])
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

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsedPreference(!isSidebarCollapsed)
  }, [isSidebarCollapsed])

  if (loading || !auth || !auth.currentTenantId) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="bg-background flex h-dvh overflow-hidden">
      <aside
        className={cn(
          'border-border/70 bg-card hidden shrink-0 flex-col gap-4 border-r px-2 py-4 transition-[width,padding] duration-200 ease-out motion-reduce:transition-none md:flex',
          isSidebarCollapsed ? 'w-20' : 'w-64'
        )}
      >
        <div
          className={cn(
            'flex h-14 shrink-0 items-center',
            isSidebarCollapsed ? 'justify-center' : 'justify-between gap-2 px-2'
          )}
        >
          {!isSidebarCollapsed && (
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-md text-xs font-bold">
                OS
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium">Oputech Sales</p>
                <p className="text-text-secondary truncate text-xs">
                  Business operations
                </p>
              </div>
            </div>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-10"
            onClick={toggleSidebar}
            aria-controls="desktop-sidebar-navigation"
            aria-expanded={!isSidebarCollapsed}
            aria-label={
              isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'
            }
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isSidebarCollapsed ? (
              <PanelLeftOpen className="size-5" aria-hidden="true" />
            ) : (
              <PanelLeftClose className="size-5" aria-hidden="true" />
            )}
          </Button>
        </div>
        <SidebarTenantSwitcher collapsed={isSidebarCollapsed} />
        <nav
          id="desktop-sidebar-navigation"
          className="flex min-h-0 flex-1 flex-col gap-4"
          aria-label="Primary navigation"
        >
          <div className="flex min-h-0 flex-1 flex-col gap-0 overflow-y-auto">
            {navigation.map((item) => (
              <NavigationLink
                key={item.href}
                item={item}
                collapsed={isSidebarCollapsed}
              />
            ))}
            {isAdmin && (
              <div className="border-border/70 mt-2 flex flex-col gap-0 border-t pt-2">
                <p
                  className={cn(
                    'text-text-tertiary px-1.5 py-1 text-xs font-medium tracking-wide uppercase',
                    isSidebarCollapsed && 'sr-only'
                  )}
                >
                  Manage
                </p>
                {adminNavigation
                  .filter((item) => item.href !== '/users' || isSuperAdmin)
                  .map((item) => (
                    <NavigationLink
                      key={item.href}
                      item={item}
                      collapsed={isSidebarCollapsed}
                    />
                  ))}
              </div>
            )}
          </div>
          <AccountProfileLink
            username={auth.username}
            email={auth.email}
            isAdmin={isAdmin}
            collapsed={isSidebarCollapsed}
          />
        </nav>
      </aside>

      <div className="bg-background flex min-w-0 flex-1 flex-col">
        {!isRouteActive(pathname, accountNavigation.href) && (
          <header className="border-border/60 bg-background/95 flex h-16 shrink-0 items-center justify-between border-b px-5 backdrop-blur md:hidden">
            <div className="flex items-center gap-3">
              <span className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-md text-xs font-bold">
                OS
              </span>
              <h1 className="max-w-[13rem] truncate text-base font-medium">
                {tenant.currentTenant?.name ?? 'Oputech Sales'}
              </h1>
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
        )}

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
          className="bg-card z-30 shrink-0 pt-1 pb-[calc(0.25rem+env(safe-area-inset-bottom))] shadow-[0_-2px_8px_rgba(16,16,16,0.05)] md:hidden"
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
