import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useTenantContext } from '@/context/tenant/useTenantContext'
import { productKeys } from '../product/product.queries'
import {
  enableStockTracking,
  getStockMovements,
  getStocks,
  receiveStock,
  reconcileStock,
} from './stock.api'
import type {
  EnableStockTrackingInput,
  ReceiveStockInput,
  ReconcileStockInput,
  StockMovementReason,
} from './stock.types'

export const stockKeys = {
  all: ['stocks'] as const,
  tenant: (tenantId?: string) => [...stockKeys.all, tenantId] as const,
  list: (tenantId: string | undefined, search: string, page: number) =>
    [...stockKeys.tenant(tenantId), 'list', search, page] as const,
  movements: (
    tenantId: string | undefined,
    page: number,
    productId?: string,
    reason?: StockMovementReason,
  ) => [...stockKeys.tenant(tenantId), 'movements', page, productId, reason] as const,
}

export const useStocks = (search: string, page: number) => {
  const { currentTenant } = useTenantContext()
  const tenantId = currentTenant?.id
  return useQuery({
    queryKey: stockKeys.list(tenantId, search.trim(), page),
    queryFn: () => getStocks(search, page, tenantId),
    enabled: !!tenantId,
  })
}

export const useStockMovements = (
  page: number,
  productId?: string,
  reason?: StockMovementReason,
  enabled = true,
) => {
  const { currentTenant } = useTenantContext()
  const tenantId = currentTenant?.id
  return useQuery({
    queryKey: stockKeys.movements(tenantId, page, productId, reason),
    queryFn: () => getStockMovements(page, productId, reason, tenantId),
    enabled: !!tenantId && enabled,
  })
}

const useStockMutation = <TInput>(
  mutationFn: (input: TInput, tenantId?: string) => Promise<unknown>,
  successMessage: string,
) => {
  const queryClient = useQueryClient()
  const { currentTenant } = useTenantContext()
  const tenantId = currentTenant?.id
  return useMutation({
    networkMode: 'always',
    mutationFn: (input: TInput) => mutationFn(input, tenantId),
    onSuccess: async () => {
      toast.success(successMessage)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: stockKeys.tenant(tenantId) }),
        queryClient.invalidateQueries({ queryKey: productKeys.tenant(tenantId) }),
      ])
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Stock could not be updated')
    },
  })
}

export const useEnableStockTracking = () =>
  useStockMutation<EnableStockTrackingInput>(
    enableStockTracking,
    'Stock tracking enabled',
  )

export const useReceiveStock = () =>
  useStockMutation<ReceiveStockInput>(receiveStock, 'Stock received')

export const useReconcileStock = () =>
  useStockMutation<ReconcileStockInput>(reconcileStock, 'Stock count reconciled')
