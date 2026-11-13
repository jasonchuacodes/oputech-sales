import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useTenantContext } from '@/context/tenant/useTenantContext'
import { offlineDb } from '@/offline/database'
import type { InventoryProduct } from '../product/product.types'
import { productKeys } from '../product/product.queries'
import {
  createStockUnitOption,
  enableStockTracking,
  getStockMovements,
  getStockUnitOptions,
  receiveStock,
  reconcileStock,
} from './stock.api'
import type {
  EnableStockTrackingInput,
  ReceiveStockInput,
  ReconcileStockInput,
  StockMovementReason,
  StockUnitOption,
} from './stock.types'

export const stockKeys = {
  all: ['stocks'] as const,
  tenant: (tenantId?: string) => [...stockKeys.all, tenantId] as const,
  unitOptions: (tenantId?: string) =>
    [...stockKeys.tenant(tenantId), 'unit-options'] as const,
  movements: (
    tenantId: string | undefined,
    page: number,
    productId?: string,
    reason?: StockMovementReason
  ) =>
    [
      ...stockKeys.tenant(tenantId),
      'movements',
      page,
      productId,
      reason,
    ] as const,
}

export const useStockUnitOptions = (enabled = true) => {
  const { currentTenant } = useTenantContext()
  const tenantId = currentTenant?.id
  return useQuery({
    queryKey: stockKeys.unitOptions(tenantId),
    queryFn: () => getStockUnitOptions(tenantId),
    enabled: !!tenantId && enabled,
  })
}

export const useCreateStockUnitOption = () => {
  const queryClient = useQueryClient()
  const { currentTenant } = useTenantContext()
  const tenantId = currentTenant?.id
  return useMutation({
    networkMode: 'always',
    mutationFn: (label: string) => createStockUnitOption(label, tenantId),
    onSuccess: (option) => {
      queryClient.setQueryData<StockUnitOption[]>(
        stockKeys.unitOptions(tenantId),
        (current = []) =>
          [...current.filter((item) => item.label !== option.label), option].sort(
            (left, right) =>
              left.label.localeCompare(right.label, undefined, {
                sensitivity: 'base',
              })
          )
      )
      toast.success('Base unit added')
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'The base unit could not be added'
      )
    },
  })
}

export const useStockMovements = (
  page: number,
  productId?: string,
  reason?: StockMovementReason,
  enabled = true
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
  mutationFn: (input: TInput, tenantId?: string) => Promise<InventoryProduct>,
  successMessage: string
) => {
  const queryClient = useQueryClient()
  const { currentTenant } = useTenantContext()
  const tenantId = currentTenant?.id
  return useMutation({
    networkMode: 'always',
    mutationFn: (input: TInput) => mutationFn(input, tenantId),
    onSuccess: async (product) => {
      toast.success(successMessage)
      if (tenantId) {
        await offlineDb.products.put({
          ...product,
          tenantId,
          cachedAt: new Date().toISOString(),
        })
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: stockKeys.tenant(tenantId) }),
        queryClient.invalidateQueries({
          queryKey: productKeys.tenant(tenantId),
        }),
      ])
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Stock could not be updated'
      )
    },
  })
}

export const useEnableStockTracking = () =>
  useStockMutation<EnableStockTrackingInput>(
    enableStockTracking,
    'Stock tracking enabled'
  )

export const useReceiveStock = () =>
  useStockMutation<ReceiveStockInput>(receiveStock, 'Stock received')

export const useReconcileStock = () =>
  useStockMutation<ReconcileStockInput>(
    reconcileStock,
    'Stock count reconciled'
  )
