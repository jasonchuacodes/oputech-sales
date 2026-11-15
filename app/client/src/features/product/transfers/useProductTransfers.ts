'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useSyncContext } from '@/context/sync/useSyncContext'
import { useTenantContext } from '@/context/tenant/useTenantContext'
import { productKeys } from '@/services/product/product.queries'
import { uploadProductImport } from '@/services/product-transfer/product-transfer.api'
import {
  productTransferKeys,
  useCancelProductImport,
  useConfirmProductImport,
  useCreateProductExport,
  useCreateProductImportUpload,
  useCurrentProductTransfer,
  useProductTransferDownload,
  useQueueProductImportValidation,
} from '@/services/product-transfer/product-transfer.queries'
import {
  ProductTransferArtifact,
  ProductTransferStatus,
  ProductTransferType,
  isActiveProductTransfer,
  type ProductTransferJob,
  type ProductTransferUploadAuthorization,
} from '@/services/product-transfer/product-transfer.types'
import { validateProductImportFile } from '../schemas/product-import.schema'

type DialogKind = ProductTransferType | null
type DialogView = 'new' | 'job'

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback

const isRelevantTerminalJob = (job: ProductTransferJob): boolean => {
  if (isActiveProductTransfer(job)) return true
  if (
    [ProductTransferStatus.Cancelled, ProductTransferStatus.Expired].includes(
      job.status
    )
  ) {
    return false
  }
  return (
    !job.filesExpireAt || new Date(job.filesExpireAt).getTime() > Date.now()
  )
}

export const useProductTransfers = (enabled: boolean) => {
  const queryClient = useQueryClient()
  const { currentTenant } = useTenantContext()
  const { refreshInBackground } = useSyncContext()
  const tenantId = currentTenant?.id
  const currentTransfer = useCurrentProductTransfer(enabled)
  const createImportUpload = useCreateProductImportUpload()
  const queueValidation = useQueueProductImportValidation()
  const confirmImportMutation = useConfirmProductImport()
  const cancelImportMutation = useCancelProductImport()
  const createExportMutation = useCreateProductExport()
  const downloadMutation = useProductTransferDownload()
  const [dialogKind, setDialogKind] = useState<DialogKind>(null)
  const [dialogView, setDialogView] = useState<DialogView>('new')
  const [selectedFile, setSelectedFile] = useState<File>()
  const [fileError, setFileError] = useState<string>()
  const [operationError, setOperationError] = useState<string>()
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [uploadAuthorization, setUploadAuthorization] =
    useState<ProductTransferUploadAuthorization>()
  const [dismissedJobId, setDismissedJobId] = useState<string>()
  const uploadAbortController = useRef<AbortController | undefined>(undefined)
  const refreshedImports = useRef(new Set<string>())
  const job = currentTransfer.data ?? null
  const transferActive = isActiveProductTransfer(job)

  useEffect(() => {
    if (
      !job ||
      job.type !== ProductTransferType.Import ||
      ![
        ProductTransferStatus.Completed,
        ProductTransferStatus.CompletedWithSkips,
        ProductTransferStatus.Failed,
      ].includes(job.status) ||
      (job.status === ProductTransferStatus.Failed && job.appliedRows === 0) ||
      refreshedImports.current.has(job.id)
    ) {
      return
    }

    refreshedImports.current.add(job.id)
    void Promise.allSettled([
      queryClient.invalidateQueries({ queryKey: productKeys.tenant(tenantId) }),
      refreshInBackground(),
    ])
  }, [job, queryClient, refreshInBackground, tenantId])

  const resetImportSetup = useCallback(() => {
    setSelectedFile(undefined)
    setFileError(undefined)
    setOperationError(undefined)
    setUploadProgress(0)
    setUploadAuthorization(undefined)
    uploadAbortController.current = undefined
  }, [])

  const openImport = useCallback(() => {
    if (job) setDismissedJobId(job.id)
    resetImportSetup()
    setDialogView('new')
    setDialogKind(ProductTransferType.Import)
  }, [job, resetImportSetup])

  const openExport = useCallback(() => {
    if (job) setDismissedJobId(job.id)
    setOperationError(undefined)
    setDialogView('new')
    setDialogKind(ProductTransferType.Export)
  }, [job])

  const openTransfer = useCallback(() => {
    if (!job) return
    setDialogView('job')
    setDialogKind(job.type)
  }, [job])

  const dismissDialog = useCallback(() => {
    if (dialogView === 'job' && job && !isActiveProductTransfer(job)) {
      setDismissedJobId(job.id)
    }
    setDialogKind(null)
  }, [dialogView, job])

  const dismissDock = useCallback(() => {
    if (job && !isActiveProductTransfer(job)) setDismissedJobId(job.id)
  }, [job])

  const selectFile = useCallback((file?: File) => {
    setSelectedFile(file)
    setFileError(file ? validateProductImportFile(file) : undefined)
    setOperationError(undefined)
  }, [])

  const uploadAndValidate = useCallback(
    async (file: File, authorization: ProductTransferUploadAuthorization) => {
      const abortController = new AbortController()
      uploadAbortController.current = abortController
      setUploading(true)
      setUploadProgress(0)
      setOperationError(undefined)
      try {
        await uploadProductImport(
          authorization,
          file,
          setUploadProgress,
          abortController.signal
        )
        await queueValidation.mutateAsync(authorization.job.id)
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          const message = errorMessage(
            error,
            'The workbook could not be uploaded.'
          )
          setOperationError(message)
          toast.error(message)
        }
      } finally {
        setUploading(false)
        uploadAbortController.current = undefined
      }
    },
    [queueValidation]
  )

  const beginImport = useCallback(async () => {
    if (!selectedFile) {
      setFileError('Select an .xlsx workbook.')
      return
    }
    const validationError = validateProductImportFile(selectedFile)
    if (validationError) {
      setFileError(validationError)
      return
    }

    setOperationError(undefined)
    try {
      const authorization = await createImportUpload.mutateAsync(selectedFile)
      setDismissedJobId(undefined)
      setUploadAuthorization(authorization)
      setDialogView('job')
      await uploadAndValidate(selectedFile, authorization)
    } catch (error) {
      const message = errorMessage(
        error,
        'The product import could not be started.'
      )
      setOperationError(message)
      toast.error(message)
    }
  }, [createImportUpload, selectedFile, uploadAndValidate])

  const retryUpload = useCallback(async () => {
    if (!selectedFile || !uploadAuthorization) return
    await uploadAndValidate(selectedFile, uploadAuthorization)
  }, [selectedFile, uploadAndValidate, uploadAuthorization])

  const cancelImport = useCallback(async () => {
    uploadAbortController.current?.abort()
    if (!job || job.type !== ProductTransferType.Import) {
      resetImportSetup()
      setDialogKind(null)
      return
    }
    try {
      await cancelImportMutation.mutateAsync(job.id)
      setDialogKind(null)
      setDismissedJobId(job.id)
      resetImportSetup()
    } catch (error) {
      const message = errorMessage(error, 'The import could not be cancelled.')
      setOperationError(message)
      toast.error(message)
    }
  }, [cancelImportMutation, job, resetImportSetup])

  const confirmImport = useCallback(async () => {
    if (!job || job.status !== ProductTransferStatus.AwaitingConfirmation)
      return
    setOperationError(undefined)
    try {
      await confirmImportMutation.mutateAsync(job.id)
    } catch (error) {
      const message = errorMessage(error, 'The import could not be confirmed.')
      setOperationError(message)
      toast.error(message)
    }
  }, [confirmImportMutation, job])

  const beginExport = useCallback(async () => {
    setOperationError(undefined)
    try {
      await createExportMutation.mutateAsync(undefined)
      setDismissedJobId(undefined)
      setDialogView('job')
    } catch (error) {
      const message = errorMessage(
        error,
        'The product export could not be started.'
      )
      setOperationError(message)
      toast.error(message)
    }
  }, [createExportMutation])

  const download = useCallback(
    async (artifact: ProductTransferArtifact) => {
      if (!job) return
      try {
        const authorization = await downloadMutation.mutateAsync({
          jobId: job.id,
          artifact,
        })
        const link = document.createElement('a')
        link.href = authorization.url
        link.rel = 'noopener'
        document.body.appendChild(link)
        link.click()
        link.remove()
      } catch (error) {
        const message = errorMessage(error, 'The file could not be downloaded.')
        setOperationError(message)
        toast.error(message)
      }
    },
    [downloadMutation, job]
  )

  const refetch = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: productTransferKeys.current(tenantId),
    })
  }, [queryClient, tenantId])

  const dockVisible =
    dialogKind === null &&
    !!job &&
    dismissedJobId !== job.id &&
    isRelevantTerminalJob(job)

  return {
    job,
    transferActive,
    queryError: currentTransfer.error,
    dialogKind,
    dialogView,
    selectedFile,
    fileError,
    operationError,
    uploadProgress,
    uploading,
    dockVisible,
    startingImport: createImportUpload.isPending,
    queueingValidation: queueValidation.isPending,
    confirmingImport: confirmImportMutation.isPending,
    cancellingImport: cancelImportMutation.isPending,
    startingExport: createExportMutation.isPending,
    downloading: downloadMutation.isPending,
    openImport,
    openExport,
    openTransfer,
    dismissDialog,
    dismissDock,
    selectFile,
    beginImport,
    retryUpload,
    cancelImport,
    confirmImport,
    beginExport,
    downloadResult: () => download(ProductTransferArtifact.Result),
    downloadErrorReport: () => download(ProductTransferArtifact.ErrorReport),
    refetch,
  }
}

export type ProductTransfersController = ReturnType<typeof useProductTransfers>
