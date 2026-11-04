'use client'

import Link from 'next/link'
import { ArrowLeftRight, Building2 } from 'lucide-react'
import { useTenantContext } from '@/context/tenant/useTenantContext'
import { cn } from '@/utils/cn'

export const SidebarTenantSwitcher = ({
  collapsed,
}: {
  collapsed: boolean
}) => {
  const tenant = useTenantContext()

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
        {tenant.currentTenant?.name ?? 'No tenant selected'}
      </span>
      {tenant.canSwitch && (
        <ArrowLeftRight
          className={cn(
            'text-text-secondary size-4 shrink-0',
            collapsed && 'hidden'
          )}
          aria-hidden="true"
        />
      )}
    </>
  )

  const className = cn(
    'bg-primary/5 text-primary focus-visible:ring-ring/30 flex min-h-12 w-full items-center gap-3 rounded-md px-2 text-left outline-none focus-visible:ring-3',
    tenant.canSwitch ? 'hover:bg-primary/10' : 'cursor-default',
    collapsed && 'justify-center px-0'
  )

  if (!tenant.canSwitch) {
    return (
      <div aria-label="Active tenant" className={className}>
        {content}
      </div>
    )
  }

  return (
    <Link
      href="/tenants"
      aria-label={collapsed ? 'Manage tenants' : undefined}
      title={collapsed ? tenant.currentTenant?.name : undefined}
      className={className}
    >
      {content}
    </Link>
  )
}
