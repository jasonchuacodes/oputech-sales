import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTenantContext } from '@/context/tenant/useTenantContext'
import {
  cancelProductImport,
  confirmProductImport,
  createProductExport,
  createProductImportUpload,
  createProductTransferDownloadUrl,
  getCurrentProductTransfer,
  queueProductImportValidation,
} from './product-transfer.api'
import {
  isActiveProductTransfer,
  type ProductTransferArtifact,
  type ProductTransferJob,
} from './product-transfer.types'

export const productTransferKeys = {
  all: ['product-transfers'] as const,
  current: (tenantId?: string) =>
    [...productTransferKeys.all, tenantId, 'current'] as const,
}

export const useCurrentProductTransfer = (enabled: boolean) => {
  const { currentTenant } = useTenantContext()
  const tenantId = currentTenant?.id
  return useQuery({
    queryKey: productTransferKeys.current(tenantId),
    queryFn: () => getCurrentProductTransfer(tenantId),
    enabled: enabled && !!tenantId,
    staleTime: 5_000,
    refetchInterval: (query) =>
      isActiveProductTransfer(query.state.data) ? 2_000 : false,
  })
}

const useTransferMutation = <TVariables>(
  mutationFn: (
    variables: TVariables,
    tenantId?: string
  ) => Promise<ProductTransferJob>
) => {
  const queryClient = useQueryClient()
  const { currentTenant } = useTenantContext()
  const tenantId = currentTenant?.id
  return useMutation({
    mutationFn: (variables: TVariables) => mutationFn(variables, tenantId),
    onSuccess: (job) => {
      queryClient.setQueryData(productTransferKeys.current(tenantId), job)
    },
  })
}

export const useCreateProductImportUpload = () => {
  const queryClient = useQueryClient()
  const { currentTenant } = useTenantContext()
  const tenantId = currentTenant?.id
  return useMutation({
    mutationFn: (file: File) => createProductImportUpload(file, tenantId),
    onSuccess: ({ job }) => {
      queryClient.setQueryData(productTransferKeys.current(tenantId), job)
    },
  })
}

export const useQueueProductImportValidation = () =>
  useTransferMutation((jobId: string, tenantId) =>
    queueProductImportValidation(jobId, tenantId)
  )

export const useConfirmProductImport = () =>
  useTransferMutation((jobId: string, tenantId) =>
    confirmProductImport(jobId, tenantId)
  )

export const useCancelProductImport = () =>
  useTransferMutation((jobId: string, tenantId) =>
    cancelProductImport(jobId, tenantId)
  )

export const useCreateProductExport = () =>
  useTransferMutation((_variables: undefined, tenantId) =>
    createProductExport(tenantId)
  )

export const useProductTransferDownload = () => {
  const { currentTenant } = useTenantContext()
  const tenantId = currentTenant?.id
  return useMutation({
    mutationFn: ({
      jobId,
      artifact,
    }: {
      jobId: string
      artifact: ProductTransferArtifact
    }) => createProductTransferDownloadUrl(jobId, artifact, tenantId),
  })
}
