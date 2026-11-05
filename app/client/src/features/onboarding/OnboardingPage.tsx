'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Building2, Check, LogOut, Plus, Users } from 'lucide-react'
import { Button, Input, Label, Spinner } from '@/components'
import { useAuthContext } from '@/context/auth/useAuthContext'
import { useTenantContext } from '@/context/tenant/useTenantContext'
import { getApiErrorMessage } from '@/lib/api-error'
import { PublicRoutes, userHomePath } from '@/routes/paths'
import type { Tenant } from '@/services/tenant/tenant.types'
import { UserRole } from '@/types'

export default function OnboardingPage() {
  const router = useRouter()
  const { auth, loading: authLoading, logout } = useAuthContext()
  const tenant = useTenantContext()
  const [name, setName] = useState('')
  const [error, setError] = useState<string>()
  const [selectingTenantId, setSelectingTenantId] = useState<string>()

  useEffect(() => {
    if (authLoading) return
    if (!auth) {
      router.replace(PublicRoutes.Login)
      return
    }
    if (auth.currentTenantId) router.replace(userHomePath(auth.role))
  }, [auth, authLoading, router])

  const continueToApp = () => {
    if (auth) router.replace(userHomePath(auth.role))
  }

  const selectTenant = async (item: Tenant) => {
    setError(undefined)
    setSelectingTenantId(item.id)
    try {
      await tenant.switchTenant(item.id)
      continueToApp()
    } catch (cause) {
      setError(getApiErrorMessage(cause, 'Unable to select this tenant.'))
    } finally {
      setSelectingTenantId(undefined)
    }
  }

  const createTenant = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const value = name.trim()
    if (!value) return

    setError(undefined)
    try {
      await tenant.create(value)
      continueToApp()
    } catch (cause) {
      setError(getApiErrorMessage(cause, 'Unable to create the tenant.'))
    }
  }

  if (authLoading || !auth || !!auth.currentTenantId || tenant.loading) {
    return (
      <div className="app-canvas flex min-h-dvh items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  const isSuperAdmin = auth.role === UserRole.SUPERADMIN
  const canSelect = auth.role !== UserRole.STAFF
  const busy = tenant.creating || tenant.switching || !!selectingTenantId
  const noAvailableTenant =
    auth.role === UserRole.STAFF ||
    (!isSuperAdmin && tenant.tenants.length === 0)

  return (
    <div className="app-canvas min-h-dvh px-5 py-8 sm:px-6">
      <main className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-lg flex-col justify-center">
        <div className="mb-6 text-center">
          <div className="bg-primary text-primary-foreground rounded-card mx-auto mb-4 flex size-12 items-center justify-center text-base font-bold">
            OS
          </div>
          <h1 className="text-xl font-semibold">Set up your workspace</h1>
          <p className="text-text-secondary mt-2">
            Select where you&apos;ll manage sales, inventory, and reports.
          </p>
        </div>

        <div className="rounded-card bg-card shadow-card p-4 sm:p-5">
          {canSelect && tenant.tenants.length > 0 && (
            <section aria-labelledby="available-tenants-heading">
              <div className="mb-4 flex items-start gap-3">
                <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-full">
                  <Building2 className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <h2
                    id="available-tenants-heading"
                    className="text-text-heading font-medium"
                  >
                    Choose a tenant
                  </h2>
                  <p className="text-text-secondary mt-0.5 text-sm">
                    You can switch later from your account.
                  </p>
                </div>
              </div>

              <ul className="flex flex-col gap-2">
                {tenant.tenants.map((item) => {
                  const selecting = selectingTenantId === item.id
                  return (
                    <li key={item.id}>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-auto min-h-11 w-full justify-start px-3 py-2.5 text-left"
                        disabled={busy}
                        onClick={() => void selectTenant(item)}
                      >
                        <Building2
                          className="text-primary size-5"
                          aria-hidden="true"
                        />
                        <span className="min-w-0 flex-1 truncate">
                          {item.name}
                        </span>
                        {selecting ? (
                          <Spinner size="xs" variant="current" />
                        ) : (
                          <ArrowRight
                            className="text-text-tertiary size-4"
                            aria-hidden="true"
                          />
                        )}
                      </Button>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}

          {isSuperAdmin && tenant.tenants.length > 0 && (
            <div className="my-6 flex items-center gap-3" aria-hidden="true">
              <span className="bg-border h-px flex-1" />
              <span className="text-text-tertiary text-xs font-medium tracking-wide uppercase">
                Or create new
              </span>
              <span className="bg-border h-px flex-1" />
            </div>
          )}

          {isSuperAdmin && (
            <section aria-labelledby="create-tenant-heading">
              <div className="mb-4 flex items-start gap-3">
                <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-full">
                  <Plus className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <h2
                    id="create-tenant-heading"
                    className="text-text-heading font-medium"
                  >
                    {tenant.tenants.length > 0
                      ? 'Create another tenant'
                      : 'Create your first tenant'}
                  </h2>
                  <p className="text-text-secondary mt-0.5 text-sm">
                    Use your business or branch name.
                  </p>
                </div>
              </div>

              <form className="flex flex-col gap-4" onSubmit={createTenant}>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="tenant-name">Tenant name</Label>
                  <Input
                    id="tenant-name"
                    autoFocus={tenant.tenants.length === 0}
                    value={name}
                    maxLength={80}
                    placeholder="e.g. Main Store"
                    disabled={busy}
                    onChange={(event) => setName(event.target.value)}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={!name.trim() || busy}
                >
                  {tenant.creating ? (
                    <>
                      <Spinner size="xs" variant="current" />
                      Creating tenant…
                    </>
                  ) : (
                    <>
                      <Check className="size-4" aria-hidden="true" />
                      Create and continue
                    </>
                  )}
                </Button>
              </form>
            </section>
          )}

          {noAvailableTenant && (
            <section
              className="text-center"
              aria-labelledby="setup-needed-heading"
            >
              <span className="bg-primary/10 text-primary mx-auto flex size-12 items-center justify-center rounded-full">
                <Users className="size-6" aria-hidden="true" />
              </span>
              <h2 id="setup-needed-heading" className="mt-4 font-medium">
                Tenant access required
              </h2>
              <p className="text-text-secondary mt-2 text-sm">
                {auth.role === UserRole.STAFF
                  ? 'Ask your administrator to assign this account to a tenant.'
                  : 'Ask a super administrator to assign at least one tenant to your account.'}
              </p>
            </section>
          )}

          {error && (
            <p
              role="alert"
              className="bg-danger/5 text-status-error mt-4 rounded-sm p-3 text-sm"
            >
              {error}
            </p>
          )}
        </div>

        <Button
          type="button"
          variant="ghost"
          className="text-text-secondary mx-auto mt-4"
          onClick={logout}
        >
          <LogOut className="size-4" aria-hidden="true" />
          Sign out
        </Button>
      </main>
    </div>
  )
}
