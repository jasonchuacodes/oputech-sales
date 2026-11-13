'use client'

import {
  createContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthContext } from '../auth/useAuthContext'
import {
  useCreateTenant,
  useDeleteTenant,
  useSelectTenant,
  useTenants,
  useUpdateTenant,
} from '../../services/tenant/tenant.queries'
import { Tenant, TenantType } from '../../services/tenant/tenant.types'
import { setActiveTenantId } from '../../lib/tenant-scope'
import { UserRole } from '../../types'

interface TenantContextValue {
  tenants: Tenant[]
  currentTenant?: Tenant
  loading: boolean
  canSwitch: boolean
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
  switching: boolean
  creating: boolean
  updating: boolean
  deleting: boolean
  switchTenant: (tenantId: string) => Promise<void>
  create: (name: string, type: TenantType) => Promise<Tenant>
  update: (tenantId: string, name: string, type: TenantType) => Promise<Tenant>
  remove: (tenantId: string) => Promise<void>
}

export const TenantContext = createContext<TenantContextValue | undefined>(
  undefined
)

export const TenantProvider = ({ children }: { children: ReactNode }) => {
  const { auth, refetch } = useAuthContext()
  const queryClient = useQueryClient()
  const [localSelection, setLocalSelection] = useState<{
    userId: string
    tenantId?: string
  }>()
  const tenantQuery = useTenants(auth?.id)

  const activeId = auth
    ? localSelection?.userId === auth.id
      ? localSelection.tenantId
      : auth.currentTenantId
    : undefined

  useEffect(() => {
    setActiveTenantId(activeId)
    return () => setActiveTenantId(undefined)
  }, [activeId])

  const selectionMutation = useSelectTenant(auth?.tenantSelectionVersion ?? 0)
  const creation = useCreateTenant(auth?.id)
  const update = useUpdateTenant(auth?.id)
  const deletion = useDeleteTenant(auth?.id)

  const tenants = useMemo(() => tenantQuery.data ?? [], [tenantQuery.data])
  const currentTenant = tenants.find((tenant) => tenant.id === activeId)
  const value = useMemo<TenantContextValue>(
    () => ({
      tenants,
      currentTenant,
      loading: !!auth && tenantQuery.isLoading,
      canSwitch:
        auth?.role === UserRole.SUPERADMIN || auth?.role === UserRole.ADMIN,
      canCreate: auth?.role === UserRole.SUPERADMIN,
      canEdit: auth?.role === UserRole.SUPERADMIN,
      canDelete: auth?.role === UserRole.SUPERADMIN,
      switching: selectionMutation.isPending,
      creating: creation.isPending,
      updating: update.isPending,
      deleting: deletion.isPending,
      switchTenant: async (tenantId) => {
        const user = await selectionMutation.mutateAsync(tenantId)
        setLocalSelection({ userId: user.id, tenantId: user.currentTenantId })
        await queryClient.cancelQueries()
        queryClient.removeQueries({
          predicate: (query) =>
            !['auth', 'tenants'].includes(String(query.queryKey[0])),
        })
        await refetch()
      },
      create: async (name, type) => {
        const tenant = await creation.mutateAsync({ name, type })
        await refetch()
        return tenant
      },
      update: (tenantId, name, type) =>
        update.mutateAsync({ tenantId, name, type }),
      remove: async (tenantId) => {
        await deletion.mutateAsync(tenantId)
        if (activeId === tenantId) setLocalSelection(undefined)
        await queryClient.cancelQueries()
        queryClient.removeQueries({
          predicate: (query) =>
            !['auth', 'tenants'].includes(String(query.queryKey[0])),
        })
        await refetch()
      },
    }),
    [
      auth,
      activeId,
      creation,
      currentTenant,
      deletion,
      queryClient,
      refetch,
      selectionMutation,
      tenantQuery.isLoading,
      tenants,
      update,
    ]
  )

  return (
    <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
  )
}
