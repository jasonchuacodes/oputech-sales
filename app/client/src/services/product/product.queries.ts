import { useMutation } from '@tanstack/react-query'
import { useLiveQuery } from 'dexie-react-hooks'
import toast from 'react-hot-toast'
import { createProduct, updateProduct, deleteProduct } from './product.api'
import { CreateProductInput, UpdateProductInput } from './product.types'
import { listLocalProducts } from '../../offline/repository'
import { offlineDb } from '../../offline/database'
import { useSyncContext } from '../../context/sync/useSyncContext'
import { useTenantContext } from '../../context/tenant/useTenantContext'

export function useProducts(search?: string) {
  const { currentTenant } = useTenantContext()
  const tenantId = currentTenant?.id
  const data = useLiveQuery(
    () =>
      tenantId
        ? listLocalProducts(tenantId, search)
        : Promise.resolve([]),
    [tenantId, search]
  )
  return { data, isLoading: data === undefined }
}

export function useCreateProduct() {
  const { currentTenant } = useTenantContext()
  const tenantId = currentTenant?.id
  return useMutation({
    networkMode: 'always',
    mutationFn: (input: CreateProductInput) => createProduct(input, tenantId),
    onSuccess: async (product) => {
      if (!tenantId) return
      await offlineDb.products.put({
        ...product,
        tenantId,
        cachedAt: new Date().toISOString(),
      })
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create item')
    },
  })
}

export function useUpdateProduct() {
  const { currentTenant } = useTenantContext()
  const tenantId = currentTenant?.id
  const { canModifyCatalog } = useSyncContext()
  return useMutation({
    networkMode: 'always',
    mutationFn: ({ id, input }: { id: string; input: UpdateProductInput }) => {
      if (!canModifyCatalog) {
        throw new Error('Sync pending records before changing inventory')
      }
      return updateProduct(id, input, tenantId)
    },
    onSuccess: async (product) => {
      if (!tenantId) return
      await offlineDb.products.put({
        ...product,
        tenantId,
        cachedAt: new Date().toISOString(),
      })
    },
  })
}

export function useDeleteProduct() {
  const { canModifyCatalog } = useSyncContext()
  const { currentTenant } = useTenantContext()
  const tenantId = currentTenant?.id
  return useMutation({
    networkMode: 'always',
    mutationFn: (id: string) => {
      if (!canModifyCatalog) {
        throw new Error('Sync pending records before changing inventory')
      }
      return deleteProduct(id, tenantId)
    },
    onSuccess: async (_deleted, id) => {
      await offlineDb.products.delete(id)
    },
  })
}
