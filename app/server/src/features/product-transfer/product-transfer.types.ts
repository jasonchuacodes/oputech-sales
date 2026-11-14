import { ProductTransferJobDocument } from './schemas/product-transfer-job.schema'

export interface ProductTransferConfig {
  redisUrl: string
  awsRegion: string
  bucket: string
  workerConcurrency: number
}

export interface ProductTransferQueuePayload {
  transferJobId: string
}

export interface ProductTransferUploadAuthorization {
  job: ProductTransferJobDocument
  url: string
  fields: Array<{ name: string; value: string }>
  expiresAt: string
}

export interface ProductTransferDownloadAuthorization {
  url: string
  expiresAt: string
}

export interface ParsedProductRow {
  rowNumber: number
  productId?: string
  productName?: string
  normalizedName?: string
  price?: number
  unit?: string
  quantity?: string
  errors: ProductTransferRowError[]
}

export interface ProductTransferRowError {
  rowNumber: number
  column: string
  submittedValue: string
  message: string
}
