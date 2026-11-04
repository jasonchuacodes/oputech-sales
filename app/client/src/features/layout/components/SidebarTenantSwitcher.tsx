'use client'

import { ArrowLeftRight, Building2 } from 'lucide-react'
import { useTenantContext } from '@/context/tenant/useTenantContext'
import { TenantSelector } from '@/features/account/components/TenantSelector'
import { cn } from '@/utils/cn'

export const SidebarTenantSwitcher = ({
  collapsed,
}: {
  collapsed: boolean
}) => {
  const tenant = useTenantContext()

  return (
    <TenantSelector
      trigger={
        <button
          type="button"
          disabled={!tenant.canSwitch}
          aria-label={tenant.canSwitch ? 'Select tenant' : 'Active tenant'}
          title={collapsed ? tenant.currentTenant?.name : undefined}
          className={cn(
            'bg-primary/5 text-primary hover:bg-primary/10 focus-visible:ring-ring/30 flex min-h-12 w-full items-center gap-3 rounded-md px-2 text-left outline-none focus-visible:ring-3',
            !tenant.canSwitch && 'hover:bg-primary/5 cursor-default',
            collapsed && 'justify-center px-0'
          )}
        >
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
        </button>
      }
    />
  )
}
