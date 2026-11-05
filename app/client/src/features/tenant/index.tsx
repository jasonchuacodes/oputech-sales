'use client'

import { useState } from 'react'
import {
  ArrowLeftRight,
  Building2,
  Check,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  Button,
  ConfirmationDialog,
  CustomModal,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Label,
  PageHeader,
  Spinner,
} from '@/components'
import { useSyncContext } from '@/context/sync/useSyncContext'
import { useTenantContext } from '@/context/tenant/useTenantContext'
import { getApiErrorMessage } from '@/lib/api-error'
import type { Tenant } from '@/services/tenant/tenant.types'

const TenantsPage = () => {
  const tenant = useTenantContext()
  const sync = useSyncContext()
  const [createOpen, setCreateOpen] = useState(false)
  const [tenantToEdit, setTenantToEdit] = useState<Tenant>()
  const [tenantToDelete, setTenantToDelete] = useState<Tenant>()
  const [name, setName] = useState('')
  const [error, setError] = useState<string>()
  const [switchingTenantId, setSwitchingTenantId] = useState<string>()

  const closeEditor = () => {
    setCreateOpen(false)
    setTenantToEdit(undefined)
    setName('')
    setError(undefined)
  }

  const openCreate = () => {
    setName('')
    setError(undefined)
    setTenantToEdit(undefined)
    setCreateOpen(true)
  }

  const openEdit = (item: Tenant) => {
    setName(item.name)
    setError(undefined)
    setCreateOpen(false)
    setTenantToEdit(item)
  }

  const saveTenant = async () => {
    const value = name.trim()
    if (!value) return
    setError(undefined)
    try {
      if (tenantToEdit) {
        await tenant.update(tenantToEdit.id, value)
        toast.success('Tenant updated')
      } else {
        await tenant.create(value)
        toast.success('Tenant created')
      }
      closeEditor()
    } catch (cause) {
      setError(
        getApiErrorMessage(
          cause,
          tenantToEdit
            ? 'Unable to update the tenant.'
            : 'Unable to create the tenant.'
        )
      )
    }
  }

  const switchTo = async (item: Tenant) => {
    if (item.id === tenant.currentTenant?.id) return
    setSwitchingTenantId(item.id)
    try {
      if (sync.blockedCount > 0) {
        throw new Error('Resolve blocked changes before switching tenants.')
      }
      if (sync.pendingCount > 0 || sync.isSyncing) await sync.syncNow()
      await tenant.switchTenant(item.id)
      toast.success(`Switched to ${item.name}`)
    } catch (cause) {
      toast.error(getApiErrorMessage(cause, 'Unable to switch tenants.'))
    } finally {
      setSwitchingTenantId(undefined)
    }
  }

  const removeTenant = async () => {
    if (!tenantToDelete) return
    try {
      await tenant.remove(tenantToDelete.id)
      setTenantToDelete(undefined)
      toast.success('Tenant deleted')
    } catch (cause) {
      toast.error(getApiErrorMessage(cause, 'Unable to delete the tenant.'))
    }
  }

  const editorOpen = createOpen || !!tenantToEdit
  const saving = tenant.creating || tenant.updating
  const unchanged = tenantToEdit?.name === name.trim()

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-2 py-5 md:p-6">
      <PageHeader
        title="Tenants"
        description="Manage workspaces and choose where sales are recorded."
        action={
          tenant.canCreate ? (
            <Button className="gap-2" onClick={openCreate}>
              <Plus className="size-4" aria-hidden="true" />
              Add tenant
            </Button>
          ) : undefined
        }
      />

      {tenant.loading ? (
        <div className="rounded-card bg-card shadow-card h-32 animate-pulse" />
      ) : tenant.tenants.length === 0 ? (
        <div className="rounded-card bg-card shadow-card p-8 text-center">
          <Building2 className="text-text-tertiary mx-auto mb-3 size-8" />
          <p className="font-semibold">No tenants found</p>
        </div>
      ) : (
        <ul className="rounded-card bg-card shadow-card overflow-hidden">
          {tenant.tenants.map((item) => {
            const active = item.id === tenant.currentTenant?.id
            const busy =
              tenant.switching ||
              tenant.updating ||
              tenant.deleting ||
              sync.isSyncing

            return (
              <li
                key={item.id}
                className="border-border/60 flex min-h-20 items-center gap-3 border-b p-4 last:border-b-0"
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="bg-primary/10 text-primary hover:bg-primary/20 size-11 rounded-full"
                  disabled={active || busy}
                  aria-label={
                    active ? `${item.name} is active` : `Switch to ${item.name}`
                  }
                  title={active ? 'Active tenant' : `Switch to ${item.name}`}
                  onClick={() => void switchTo(item)}
                >
                  {switchingTenantId === item.id ? (
                    <Spinner size="xs" variant="current" />
                  ) : (
                    <ArrowLeftRight className="size-5" aria-hidden="true" />
                  )}
                </Button>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">
                    {item.name}
                  </span>
                  <span className="text-text-secondary mt-1 flex items-center gap-1 text-sm">
                    {active ? (
                      <>
                        <Check className="size-4" aria-hidden="true" />
                        Active tenant
                      </>
                    ) : (
                      'Available workspace'
                    )}
                  </span>
                </span>
                {(tenant.canEdit || tenant.canDelete) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-11"
                        disabled={busy}
                        aria-label={`Actions for ${item.name}`}
                        title="Tenant actions"
                      >
                        <MoreVertical className="size-4" aria-hidden="true" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      {tenant.canEdit && (
                        <DropdownMenuItem onSelect={() => openEdit(item)}>
                          <Pencil className="size-4" aria-hidden="true" />
                          Edit name
                        </DropdownMenuItem>
                      )}
                      {tenant.canEdit && tenant.canDelete && (
                        <DropdownMenuSeparator />
                      )}
                      {tenant.canDelete && (
                        <DropdownMenuItem
                          variant="destructive"
                          disabled={tenant.tenants.length <= 1}
                          title={
                            tenant.tenants.length <= 1
                              ? 'You must keep at least one tenant'
                              : `Delete ${item.name}`
                          }
                          onSelect={() => setTenantToDelete(item)}
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <CustomModal
        open={editorOpen}
        title={tenantToEdit ? 'Edit tenant' : 'Add tenant'}
        subheader={
          tenantToEdit
            ? 'Update the name shown across the workspace.'
            : 'Create another workspace for sales and reporting.'
        }
        icon={tenantToEdit ? Pencil : Building2}
        submitText={tenantToEdit ? 'Save changes' : 'Create tenant'}
        loading={saving}
        disabled={!name.trim() || name.trim().length > 80 || unchanged}
        onClose={closeEditor}
        onSubmit={() => void saveTenant()}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tenant-name">Name</Label>
          <Input
            id="tenant-name"
            autoFocus
            value={name}
            maxLength={80}
            placeholder="Tenant name"
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === 'Enter' &&
                name.trim() &&
                !saving &&
                !unchanged
              ) {
                void saveTenant()
              }
            }}
          />
          {error && <p className="text-status-error mt-1 text-sm">{error}</p>}
        </div>
      </CustomModal>

      <ConfirmationDialog
        open={!!tenantToDelete}
        title="Delete tenant?"
        icon={Trash2}
        variant="danger"
        confirmText="Delete tenant"
        description="This action cannot be undone."
        loading={tenant.deleting}
        onClose={() => setTenantToDelete(undefined)}
        onConfirm={() => void removeTenant()}
      >
        <div className="border-destructive/20 bg-destructive/5 rounded-card border p-4">
          <p className="text-sm">
            <strong>{tenantToDelete?.name}</strong> and all of its products,
            transactions, and reports will be permanently deleted.
          </p>
        </div>
      </ConfirmationDialog>
    </div>
  )
}

export default TenantsPage
