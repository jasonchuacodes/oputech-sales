export enum ProductTransferType {
  Import = 'IMPORT',
  Export = 'EXPORT',
}

export enum ProductTransferStatus {
  AwaitingUpload = 'AWAITING_UPLOAD',
  QueuedForValidation = 'QUEUED_FOR_VALIDATION',
  Validating = 'VALIDATING',
  AwaitingConfirmation = 'AWAITING_CONFIRMATION',
  QueuedForImport = 'QUEUED_FOR_IMPORT',
  Importing = 'IMPORTING',
  Queued = 'QUEUED',
  Exporting = 'EXPORTING',
  Completed = 'COMPLETED',
  CompletedWithSkips = 'COMPLETED_WITH_SKIPS',
  ValidationFailed = 'VALIDATION_FAILED',
  Failed = 'FAILED',
  Cancelled = 'CANCELLED',
  Expired = 'EXPIRED',
}

export enum ProductTransferArtifact {
  Result = 'RESULT',
  ErrorReport = 'ERROR_REPORT',
}

export interface ProductTransferJob {
  id: string
  type: ProductTransferType
  status: ProductTransferStatus
  totalRows: number
  eligibleRows: number
  skippedRows: number
  validatedRows: number
  appliedRows: number
  createdCount: number
  updatedCount: number
  unchangedCount: number
  failureCode?: string
  failureMessage?: string
  createdAt: string
  startedAt?: string
  completedAt?: string
  filesExpireAt?: string
}

export interface ProductTransferUploadField {
  name: string
  value: string
}

export interface ProductTransferUploadAuthorization {
  job: ProductTransferJob
  url: string
  fields: ProductTransferUploadField[]
  expiresAt: string
}

export interface ProductTransferDownloadAuthorization {
  url: string
  expiresAt: string
}

export const ACTIVE_PRODUCT_TRANSFER_STATUSES = new Set<ProductTransferStatus>([
  ProductTransferStatus.AwaitingUpload,
  ProductTransferStatus.QueuedForValidation,
  ProductTransferStatus.Validating,
  ProductTransferStatus.AwaitingConfirmation,
  ProductTransferStatus.QueuedForImport,
  ProductTransferStatus.Importing,
  ProductTransferStatus.Queued,
  ProductTransferStatus.Exporting,
])

export const isActiveProductTransfer = (
  job?: ProductTransferJob | null
): boolean => !!job && ACTIVE_PRODUCT_TRANSFER_STATUSES.has(job.status)

export const isCompletedProductTransfer = (
  job?: ProductTransferJob | null
): boolean =>
  !!job &&
  [
    ProductTransferStatus.Completed,
    ProductTransferStatus.CompletedWithSkips,
  ].includes(job.status)
