'use client'

import { useState, type ReactNode } from 'react'
import { Building2, Check, ChevronRight, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button, Input, Label, Spinner } from '@/components'
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
import type { Tenant } from '@/services/tenant/tenant.types'

export const TenantSelector = ({ trigger }: { trigger?: ReactNode }) => {
  const tenant = useTenantContext()
  const sync = useSyncContext()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState<string>()
  const [tenantToDelete, setTenantToDelete] = useState<Tenant>()

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

  const removeTenant = async () => {
    if (!tenantToDelete) return
    setError(undefined)
    try {
      await tenant.remove(tenantToDelete.id)
      setTenantToDelete(undefined)
      toast.success('Tenant deleted')
    } catch (cause) {
      setError(getApiErrorMessage(cause, 'Unable to delete the tenant.'))
    }
  }

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      setTenantToDelete(undefined)
      setError(undefined)
    }
  }

  const cancelDelete = () => {
    setTenantToDelete(undefined)
    setError(undefined)
  }

  if (!tenant.canSwitch) {
    if (trigger) return trigger

    return (
      <div className="rounded-card bg-card shadow-card flex items-center gap-4 p-4">
        <span className="bg-primary/10 text-primary flex size-11 items-center justify-center rounded-full">
          <Building2 className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">
            {tenant.currentTenant?.name ?? 'No tenant'}
          </span>
          <span className="text-text-secondary block text-sm">
            Your assigned tenant
          </span>
        </span>
      </div>
    )
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        {trigger ?? (
          <button className="rounded-card bg-card shadow-card flex min-h-18 w-full items-center gap-4 p-4 text-left">
            <span className="bg-primary/10 text-primary flex size-11 items-center justify-center rounded-full">
              <Building2 className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">
                {tenant.currentTenant?.name ?? 'Select tenant'}
              </span>
              <span className="text-text-secondary block text-sm">
                Switch your active workspace
              </span>
            </span>
            <ChevronRight className="text-text-tertiary size-5" />
          </button>
        )}
      </SheetTrigger>
      <SheetContent showClose>
        <SheetHeader className="pr-12">
          <div className="flex items-start gap-3">
            {tenantToDelete ? (
              <span className="bg-destructive text-primary-foreground flex size-11 shrink-0 items-center justify-center rounded-md">
                <Trash2 className="size-5" aria-hidden="true" />
              </span>
            ) : (
              <span className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-md">
                <Building2 className="size-5" aria-hidden="true" />
              </span>
            )}
            <div className="min-w-0">
              <SheetTitle>
                {tenantToDelete ? 'Delete tenant?' : 'Select tenant'}
              </SheetTitle>
              {tenantToDelete ? (
                <SheetDescription>
                  This action cannot be undone.
                </SheetDescription>
              ) : (
                <SheetDescription>
                  Sales and reports will use the selected tenant.
                </SheetDescription>
              )}
            </div>
          </div>
        </SheetHeader>
        <SheetBody className="flex flex-col gap-3">
          {tenantToDelete ? (
            <div className="border-destructive/20 bg-destructive/5 rounded-card border p-4">
              <p className="text-sm">
                <strong>{tenantToDelete.name}</strong> and all of its products,
                transactions, and reports will be permanently deleted.
              </p>
            </div>
          ) : (
            <>
              <div className="border-border rounded-card overflow-hidden border">
                {tenant.tenants.map((item) => (
                  <div
                    key={item.id}
                    className="border-border/70 flex min-h-14 items-center border-b last:border-b-0"
                  >
                    <button
                      type="button"
                      className="hover:bg-surface-hover focus-visible:bg-surface-hover flex min-h-14 min-w-0 flex-1 items-center gap-3 px-4 text-left outline-none"
                      disabled={tenant.switching || tenant.deleting}
                      onClick={() => void switchTo(item.id)}
                    >
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {item.name}
                      </span>
                      {item.id === tenant.currentTenant?.id && (
                        <Check
                          className="text-primary size-5 shrink-0"
                          aria-label="Active tenant"
                        />
                      )}
                    </button>
                    {tenant.canDelete && (
                      <button
                        type="button"
                        className="text-text-tertiary hover:bg-destructive/10 hover:text-destructive focus-visible:ring-ring/30 mr-2 flex size-10 shrink-0 items-center justify-center rounded-md outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-40"
                        disabled={tenant.tenants.length <= 1 || tenant.deleting}
                        aria-label={`Delete ${item.name}`}
                        title={
                          tenant.tenants.length <= 1
                            ? 'You must keep at least one tenant'
                            : `Delete ${item.name}`
                        }
                        onClick={() => {
                          setError(undefined)
                          setTenantToDelete(item)
                        }}
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

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
                  <Button
                    disabled={!name.trim() || tenant.creating}
                    onClick={() => void addTenant()}
                  >
                    <Plus className="size-4" />
                    Create tenant
                  </Button>
                </div>
              )}
            </>
          )}
          {error && <p className="text-status-error text-sm">{error}</p>}
        </SheetBody>
        {tenantToDelete && (
          <SheetFooter className="justify-end">
            <Button
              type="button"
              variant="outline"
              className="flex-1 sm:flex-none"
              disabled={tenant.deleting}
              onClick={cancelDelete}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="flex-1 sm:flex-none"
              disabled={tenant.deleting}
              onClick={() => void removeTenant()}
            >
              {tenant.deleting ? (
                <>
                  <Spinner size="xs" variant="current" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="size-4" />
                  Delete tenant
                </>
              )}
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}
