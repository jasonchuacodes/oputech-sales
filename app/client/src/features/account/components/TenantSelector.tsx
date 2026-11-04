'use client'

import Link from 'next/link'
import { Building2, ChevronRight } from 'lucide-react'
import { useTenantContext } from '@/context/tenant/useTenantContext'

export const TenantSelector = () => {
  const tenant = useTenantContext()
  const content = (
    <>
      <span className="bg-primary/10 text-primary flex size-11 items-center justify-center rounded-full">
        <Building2 className="size-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">
          {tenant.currentTenant?.name ?? 'No tenant'}
        </span>
        <span className="text-text-secondary block text-sm">
          {tenant.canSwitch
            ? tenant.canEdit
              ? 'View and manage your tenants'
              : 'View and switch tenants'
            : 'Your assigned tenant'}
        </span>
      </span>
      {tenant.canSwitch && (
        <ChevronRight
          className="text-text-tertiary size-5"
          aria-hidden="true"
        />
      )}
    </>
  )

  if (!tenant.canSwitch) {
    return (
      <div className="rounded-card bg-card shadow-card flex items-center gap-4 p-4">
        {content}
      </div>
    )
  }

  return (
    <Link
      href="/tenants"
      className="rounded-card bg-card hover:bg-surface-hover focus-visible:ring-ring/30 shadow-card flex min-h-18 items-center gap-4 p-4 text-left outline-none focus-visible:ring-3"
    >
      {content}
    </Link>
  )
}
