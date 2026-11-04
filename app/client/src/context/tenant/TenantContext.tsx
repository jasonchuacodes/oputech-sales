'use client'

import {
  createContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthContext } from '../auth/useAuthContext'
import {
  createTenant,
  deleteTenant,
  getTenants,
  selectTenant,
} from '../../services/tenant/tenant.api'
import { Tenant } from '../../services/tenant/tenant.types'
import { setActiveTenantId } from '../../lib/tenant-scope'
import { UserRole } from '../../types'

interface TenantContextValue {
  tenants: Tenant[]
  currentTenant?: Tenant
  loading: boolean
  canSwitch: boolean
  canCreate: boolean
  canDelete: boolean
  switching: boolean
  creating: boolean
  deleting: boolean
  switchTenant: (tenantId: string) => Promise<void>
  create: (name: string) => Promise<Tenant>
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
  const tenantQuery = useQuery({
    queryKey: ['tenants', auth?.id],
    queryFn: getTenants,
    enabled: !!auth,
  })

  const activeId = auth
    ? localSelection?.userId === auth.id
      ? localSelection.tenantId
      : auth.currentTenantId
    : undefined

  useEffect(() => {
    setActiveTenantId(activeId)
    return () => setActiveTenantId(undefined)
  }, [activeId])

  const selectionMutation = useMutation({
    mutationFn: (tenantId: string) =>
      selectTenant(tenantId, auth?.tenantSelectionVersion ?? 0),
    onSuccess: async (user) => {
      setLocalSelection({ userId: user.id, tenantId: user.currentTenantId })
      await queryClient.cancelQueries()
      queryClient.removeQueries({
        predicate: (query) =>
          !['auth', 'tenants'].includes(String(query.queryKey[0])),
      })
      await refetch()
    },
  })
  const creation = useMutation({
    mutationFn: createTenant,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tenants', auth?.id] })
      await refetch()
    },
  })
  const deletion = useMutation({
    mutationFn: deleteTenant,
    onSuccess: async (_, tenantId) => {
      if (activeId === tenantId) setLocalSelection(undefined)
      await queryClient.cancelQueries()
      queryClient.removeQueries({
        predicate: (query) =>
          !['auth', 'tenants'].includes(String(query.queryKey[0])),
      })
      await queryClient.invalidateQueries({ queryKey: ['tenants', auth?.id] })
      await refetch()
    },
  })

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
      canDelete: auth?.role === UserRole.SUPERADMIN,
      switching: selectionMutation.isPending,
      creating: creation.isPending,
      deleting: deletion.isPending,
      switchTenant: async (tenantId) =>
        selectionMutation.mutateAsync(tenantId).then(() => undefined),
      create: creation.mutateAsync,
      remove: async (tenantId) =>
        deletion.mutateAsync(tenantId).then(() => undefined),
    }),
    [
      auth,
      creation,
      currentTenant,
      deletion,
      selectionMutation,
      tenantQuery.isLoading,
      tenants,
    ]
  )

  return (
    <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
  )
}
