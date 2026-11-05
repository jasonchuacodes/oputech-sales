import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createTenant,
  deleteTenant,
  getTenants,
  selectTenant,
  updateTenant,
} from './tenant.api'

export const tenantKeys = {
  all: ['tenants'] as const,
  list: (userId?: string) => [...tenantKeys.all, userId] as const,
}

export function useTenants(userId?: string) {
  return useQuery({
    queryKey: tenantKeys.list(userId),
    queryFn: getTenants,
    enabled: !!userId,
  })
}

export function useSelectTenant(expectedVersion: number) {
  return useMutation({
    mutationFn: (tenantId: string) =>
      selectTenant(tenantId, expectedVersion),
  })
}

export function useCreateTenant(userId?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createTenant,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tenantKeys.list(userId) })
    },
  })
}

export function useUpdateTenant(userId?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateTenant,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tenantKeys.list(userId) })
    },
  })
}

export function useDeleteTenant(userId?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteTenant,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tenantKeys.list(userId) })
    },
  })
}
