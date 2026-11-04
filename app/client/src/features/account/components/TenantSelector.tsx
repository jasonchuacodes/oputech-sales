'use client'

import { useState } from 'react'
import { Building2, Check, ChevronRight, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button, Input, Label } from '@/components'
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { useTenantContext } from '@/context/tenant/useTenantContext'
import { useSyncContext } from '@/context/sync/useSyncContext'
import { getApiErrorMessage } from '@/lib/api-error'

export const TenantSelector = () => {
  const tenant = useTenantContext()
  const sync = useSyncContext()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState<string>()

  const switchTo = async (tenantId: string) => {
    if (tenant.currentTenant?.id === tenantId) return
    setError(undefined)
    try {
      if (sync.blockedCount > 0) {
        throw new Error('Resolve blocked changes before switching tenants.')
      }
      if (sync.pendingCount > 0 || sync.isSyncing) await sync.syncNow()
      await tenant.switchTenant(tenantId)
      setOpen(false)
    } catch (cause) {
      setError(getApiErrorMessage(cause, 'Unable to switch tenants.'))
    }
  }

  const addTenant = async () => {
    const value = name.trim()
    if (!value) return
    setError(undefined)
    try {
      await tenant.create(value)
      setName('')
      toast.success('Tenant created')
    } catch (cause) {
      setError(getApiErrorMessage(cause, 'Unable to create the tenant.'))
    }
  }

  if (!tenant.canSwitch) {
    return (
      <div className="rounded-card bg-card flex items-center gap-4 p-4 shadow-card">
        <span className="bg-primary/10 text-primary flex size-11 items-center justify-center rounded-full">
          <Building2 className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">
            {tenant.currentTenant?.name ?? 'No tenant'}
          </span>
          <span className="text-text-secondary block text-sm">Your assigned tenant</span>
        </span>
      </div>
    )
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="rounded-card bg-card flex min-h-18 w-full items-center gap-4 p-4 text-left shadow-card">
          <span className="bg-primary/10 text-primary flex size-11 items-center justify-center rounded-full">
            <Building2 className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold">
              {tenant.currentTenant?.name ?? 'Select tenant'}
            </span>
            <span className="text-text-secondary block text-sm">Switch your active workspace</span>
          </span>
          <ChevronRight className="text-text-tertiary size-5" />
        </button>
      </SheetTrigger>
      <SheetContent showClose>
        <SheetHeader>
          <SheetTitle>Select tenant</SheetTitle>
          <SheetDescription>Sales and reports will use the selected tenant.</SheetDescription>
        </SheetHeader>
        <SheetBody className="flex flex-col gap-3">
          {tenant.tenants.map((item) => (
            <button
              key={item.id}
              className="border-border flex min-h-12 items-center gap-3 rounded-md border px-4 text-left"
              disabled={tenant.switching}
              onClick={() => void switchTo(item.id)}
            >
              <Building2 className="text-primary size-5" />
              <span className="min-w-0 flex-1 truncate font-medium">{item.name}</span>
              {item.id === tenant.currentTenant?.id && <Check className="text-primary size-5" />}
            </button>
          ))}

          {tenant.canCreate && (
            <div className="border-border mt-3 flex flex-col gap-3 border-t pt-4">
              <Label htmlFor="tenant-name">New tenant</Label>
              <Input
                id="tenant-name"
                value={name}
                maxLength={80}
                placeholder="Tenant name"
                onChange={(event) => setName(event.target.value)}
              />
              <Button disabled={!name.trim() || tenant.creating} onClick={() => void addTenant()}>
                <Plus className="size-4" />
                Create tenant
              </Button>
            </div>
          )}
          {error && <p className="text-status-error text-sm">{error}</p>}
        </SheetBody>
        <SheetFooter />
      </SheetContent>
    </Sheet>
  )
}
