import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { createProduct, updateProduct, deleteProduct } from './product.api'
import { CreateProductInput, UpdateProductInput } from './product.types'
import { listLocalProducts } from '../../offline/repository'
import { offlineDb } from '../../offline/database'
import { useSyncContext } from '../../context/sync/useSyncContext'

export function useProducts(search?: string) {
  return useQuery({
    queryKey: ['products', search],
    queryFn: () => listLocalProducts(search),
    staleTime: 5 * 60 * 1000,
    networkMode: 'always',
  })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()
  const { canUseOnlineFeatures } = useSyncContext()
  return useMutation({
    mutationFn: (input: CreateProductInput) => {
      if (!canUseOnlineFeatures) {
        throw new Error('Sync pending records before changing inventory')
      }
      return createProduct(input)
    },
    onSuccess: async (product) => {
      await offlineDb.products.put({
        ...product,
        cachedAt: new Date().toISOString(),
      })
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create item')
    },
  })
}

export function useUpdateProduct() {
  const queryClient = useQueryClient()
  const { canUseOnlineFeatures } = useSyncContext()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateProductInput }) => {
      if (!canUseOnlineFeatures) {
        throw new Error('Sync pending records before changing inventory')
      }
      return updateProduct(id, input)
    },
    onSuccess: async (product) => {
      await offlineDb.products.put({
        ...product,
        cachedAt: new Date().toISOString(),
      })
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export function useDeleteProduct() {
  const queryClient = useQueryClient()
  const { canUseOnlineFeatures } = useSyncContext()
  return useMutation({
    mutationFn: (id: string) => {
      if (!canUseOnlineFeatures) {
        throw new Error('Sync pending records before changing inventory')
      }
      return deleteProduct(id)
    },
    onSuccess: async (_deleted, id) => {
      await offlineDb.products.delete(id)
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}
