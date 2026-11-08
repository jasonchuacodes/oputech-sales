import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLiveQuery } from 'dexie-react-hooks'
import toast from 'react-hot-toast'
import {
  PRODUCT_PAGE_SIZE,
  createProduct,
  deleteProduct,
  getProducts,
  getProductsByName,
  updateProduct,
} from './product.api'
import { CreateProductInput, UpdateProductInput } from './product.types'
import {
  listLocalProducts,
  listLocalProductsPage,
} from '../../offline/repository'
import { offlineDb } from '../../offline/database'
import { useSyncContext } from '../../context/sync/useSyncContext'
import { useTenantContext } from '../../context/tenant/useTenantContext'

export const productKeys = {
  all: ['products'] as const,
  tenant: (tenantId?: string) => [...productKeys.all, tenantId] as const,
  list: (tenantId: string | undefined, page: number) =>
    [...productKeys.tenant(tenantId), 'list', page, PRODUCT_PAGE_SIZE] as const,
  search: (tenantId: string | undefined, search: string, page: number) =>
    [
      ...productKeys.tenant(tenantId),
      'search',
      search,
      page,
      PRODUCT_PAGE_SIZE,
    ] as const,
}

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

export function useProductCatalogPage(search: string, page: number) {
  const { currentTenant } = useTenantContext()
  const { reachability } = useSyncContext()
  const tenantId = currentTenant?.id
  const normalizedSearch = search.trim()
  const useCachedCatalog = reachability === 'unreachable'
  const pagination = { page, pageSize: PRODUCT_PAGE_SIZE }
  const remoteQuery = useQuery({
    queryKey: normalizedSearch
      ? productKeys.search(tenantId, normalizedSearch, page)
      : productKeys.list(tenantId, page),
    queryFn: ({ signal }) =>
      normalizedSearch
        ? getProductsByName(
            normalizedSearch,
            pagination,
            tenantId,
            signal
          )
        : getProducts(pagination, tenantId, signal),
    enabled: !!tenantId && !useCachedCatalog,
    staleTime: 60 * 1000,
  })
  const cachedData = useLiveQuery(
    () =>
      tenantId && useCachedCatalog
        ? listLocalProductsPage(
            tenantId,
            page,
            PRODUCT_PAGE_SIZE,
            normalizedSearch || undefined
          )
        : Promise.resolve(undefined),
    [tenantId, useCachedCatalog, normalizedSearch, page]
  )

  if (useCachedCatalog) {
    return {
      data: cachedData,
      isLoading: cachedData === undefined,
      isFetching: false,
      isError: false,
      error: null,
      fetchStatus: 'idle' as const,
      source: 'cache' as const,
      refetch: remoteQuery.refetch,
    }
  }

  return {
    ...remoteQuery,
    source: 'server' as const,
  }
}

export function useCreateProduct() {
  const queryClient = useQueryClient()
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
      await queryClient.invalidateQueries({
        queryKey: productKeys.tenant(tenantId),
      })
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create item')
    },
  })
}

export function useUpdateProduct() {
  const queryClient = useQueryClient()
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
      await queryClient.invalidateQueries({
        queryKey: productKeys.tenant(tenantId),
      })
    },
  })
}

export function useDeleteProduct() {
  const queryClient = useQueryClient()
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
      await queryClient.invalidateQueries({
        queryKey: productKeys.tenant(tenantId),
      })
    },
  })
}
