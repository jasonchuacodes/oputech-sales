'use client'

import Link from 'next/link'
import { ArrowLeftRight, Building2, Star } from 'lucide-react'
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
          'border-primary/25 bg-primary/5 text-primary flex min-h-12 w-full items-center gap-3 rounded-md border border-dashed px-3',
          collapsed && 'justify-center px-1'
        )}
      >
        <span className="flex size-5 shrink-0 items-center justify-center">
          <Star className="size-4" aria-hidden="true" />
        </span>
        <span
          className={cn(
            'min-w-0 flex-1 truncate text-sm font-semibold',
            collapsed && 'sr-only'
          )}
        >
          {tenantName}
        </span>
      </div>
    )
  }

  const content = (
    <>
      <span className="flex size-8 shrink-0 items-center justify-center">
        {collapsed ? (
          <ArrowLeftRight className="size-5" aria-hidden="true" />
        ) : (
          <Building2 className="size-5" aria-hidden="true" />
        )}
      </span>
      <span
        className={cn(
          'min-w-0 flex-1 truncate text-sm font-semibold',
          collapsed && 'sr-only'
        )}
      >
        {tenantName}
      </span>
      <ArrowLeftRight
        className={cn(
          'text-text-secondary size-4 shrink-0',
          collapsed && 'hidden'
        )}
        aria-hidden="true"
      />
    </>
  )

  const className = cn(
    'bg-primary/5 text-primary focus-visible:ring-ring/30 flex min-h-12 w-full items-center gap-3 rounded-md px-2 text-left outline-none focus-visible:ring-3',
    'hover:bg-primary/10',
    collapsed && 'justify-center px-0'
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
