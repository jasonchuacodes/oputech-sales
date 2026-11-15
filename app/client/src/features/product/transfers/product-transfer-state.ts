import {
  ProductTransferStatus,
  ProductTransferType,
  isActiveProductTransfer,
  type ProductTransferJob,
} from '@/services/product-transfer/product-transfer.types'

export const transferStatusLabel = (job: ProductTransferJob): string => {
  switch (job.status) {
    case ProductTransferStatus.AwaitingUpload:
      return 'Uploading workbook'
    case ProductTransferStatus.QueuedForValidation:
      return 'Validation queued'
    case ProductTransferStatus.Validating:
      return 'Validating workbook'
    case ProductTransferStatus.AwaitingConfirmation:
      return 'Review required'
    case ProductTransferStatus.QueuedForImport:
      return 'Import queued'
    case ProductTransferStatus.Importing:
      return 'Importing products'
    case ProductTransferStatus.Queued:
      return 'Export queued'
    case ProductTransferStatus.Exporting:
      return 'Preparing export'
    case ProductTransferStatus.Completed:
      return job.type === ProductTransferType.Export
        ? 'Export ready'
        : 'Import complete'
    case ProductTransferStatus.CompletedWithSkips:
      return 'Import complete with skipped rows'
    case ProductTransferStatus.ValidationFailed:
      return 'Workbook validation failed'
    case ProductTransferStatus.Failed:
      return `${job.type === ProductTransferType.Import ? 'Import' : 'Export'} failed`
    case ProductTransferStatus.Cancelled:
      return 'Import cancelled'
    case ProductTransferStatus.Expired:
      return 'Transfer expired'
  }
}

export const transferProgress = (
  job: ProductTransferJob,
  uploadProgress: number
): number | undefined => {
  if (job.status === ProductTransferStatus.AwaitingUpload) return uploadProgress
  if (
    [
      ProductTransferStatus.QueuedForImport,
      ProductTransferStatus.Importing,
    ].includes(job.status) &&
    job.eligibleRows > 0
  ) {
    return Math.min(100, Math.round((job.appliedRows / job.eligibleRows) * 100))
  }
  return undefined
}

export const transferProgressDetail = (
  job: ProductTransferJob,
  uploadProgress: number
): string | undefined => {
  if (job.status === ProductTransferStatus.AwaitingUpload) {
    return uploadProgress > 0
      ? `${uploadProgress}% uploaded`
      : 'Preparing upload'
  }
  if (
    [
      ProductTransferStatus.QueuedForImport,
      ProductTransferStatus.Importing,
    ].includes(job.status)
  ) {
    return `${job.appliedRows.toLocaleString()} of ${job.eligibleRows.toLocaleString()} rows`
  }
  if (
    job.status === ProductTransferStatus.Completed &&
    job.type === ProductTransferType.Export
  ) {
    return `${job.totalRows.toLocaleString()} ${job.totalRows === 1 ? 'product' : 'products'}`
  }
  if (
    [
      ProductTransferStatus.Completed,
      ProductTransferStatus.CompletedWithSkips,
    ].includes(job.status) &&
    job.type === ProductTransferType.Import
  ) {
    return `${job.appliedRows.toLocaleString()} imported${job.skippedRows ? ` · ${job.skippedRows.toLocaleString()} skipped` : ''}`
  }
  return undefined
}

export const canCancelImport = (job: ProductTransferJob): boolean =>
  job.type === ProductTransferType.Import &&
  [
    ProductTransferStatus.AwaitingUpload,
    ProductTransferStatus.QueuedForValidation,
    ProductTransferStatus.Validating,
    ProductTransferStatus.AwaitingConfirmation,
    ProductTransferStatus.QueuedForImport,
  ].includes(job.status)

export const shouldMinimizeTransferDialog = (
  job?: ProductTransferJob | null
): boolean => isActiveProductTransfer(job)
