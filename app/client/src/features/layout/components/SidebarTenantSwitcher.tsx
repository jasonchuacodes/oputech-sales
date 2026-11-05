'use client'

import Link from 'next/link'
import { Building2, ChevronsUpDown, Star } from 'lucide-react'
import { useTenantContext } from '@/context/tenant/useTenantContext'
import { cn } from '@/utils/cn'

export const SidebarTenantSwitcher = ({
  collapsed,
}: {
  collapsed: boolean
}) => {
  const tenant = useTenantContext()
  const tenantName = tenant.currentTenant?.name ?? 'No tenant selected'

  if (!tenant.canSwitch) {
    return (
      <div
        aria-label="Active tenant"
        title={collapsed ? tenantName : undefined}
        className={cn(
          'border-border/60 bg-background flex min-h-14 w-full items-center gap-2 rounded-sm border px-2.5 py-2',
          collapsed && 'min-h-11 justify-center px-0 py-0'
        )}
      >
        <span className="text-text-secondary flex size-8 shrink-0 items-center justify-center">
          <Star className="size-4" aria-hidden="true" />
        </span>
        <span
          className={cn(
            'min-w-0 flex-1',
            collapsed && 'sr-only'
          )}
        >
          <span className="text-text-tertiary block text-xs leading-4">
            Current property
          </span>
          <span className="text-text-heading block truncate text-sm leading-5 font-medium">
            {tenantName}
          </span>
        </span>
      </div>
    )
  }

  const content = (
    <>
      <span className="text-text-secondary flex size-8 shrink-0 items-center justify-center">
        {collapsed ? (
          <ChevronsUpDown className="size-4" aria-hidden="true" />
        ) : (
          <Building2 className="size-4" aria-hidden="true" />
        )}
      </span>
      <span
        className={cn(
          'min-w-0 flex-1',
          collapsed && 'sr-only'
        )}
      >
        <span className="text-text-tertiary block text-xs leading-4">
          Current property
        </span>
        <span className="text-text-heading block truncate text-sm leading-5 font-medium">
          {tenantName}
        </span>
      </span>
      <ChevronsUpDown
        className={cn(
          'text-text-secondary size-4 shrink-0',
          collapsed && 'hidden'
        )}
        aria-hidden="true"
      />
    </>
  )

  const className = cn(
    'border-border/60 bg-background hover:bg-surface-hover focus-visible:ring-ring/30 flex min-h-14 w-full items-center gap-2 rounded-sm border px-2.5 py-2 text-left outline-none focus-visible:ring-3',
    collapsed && 'min-h-11 justify-center px-0 py-0'
  )

  return (
    <Link
      href="/tenants"
      aria-label={collapsed ? 'Manage tenants' : undefined}
      title={collapsed ? tenantName : undefined}
      className={className}
    >
      {content}
    </Link>
  )
}
