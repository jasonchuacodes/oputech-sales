import { requestGraphQL } from '@/lib/graphql'
import {
  ProductTransferArtifact,
  type ProductTransferDownloadAuthorization,
  type ProductTransferJob,
  type ProductTransferUploadAuthorization,
} from './product-transfer.types'

const PRODUCT_TRANSFER_JOB_FIELDS = `
  id
  type
  status
  totalRows
  eligibleRows
  skippedRows
  validatedRows
  appliedRows
  createdCount
  updatedCount
  unchangedCount
  failureCode
  failureMessage
  createdAt
  startedAt
  completedAt
  filesExpireAt
`

const GET_ACTIVE_PRODUCT_TRANSFER = `
  query ActiveProductTransferJob {
    activeProductTransferJob {
      ${PRODUCT_TRANSFER_JOB_FIELDS}
    }
  }
`

const GET_LATEST_PRODUCT_TRANSFER = `
  query LatestProductTransferJob {
    latestProductTransferJob {
      ${PRODUCT_TRANSFER_JOB_FIELDS}
    }
  }
`

const GET_PRODUCT_TRANSFER = `
  query ProductTransferJob($id: ID!) {
    productTransferJob(id: $id) {
      ${PRODUCT_TRANSFER_JOB_FIELDS}
    }
  }
`

const CREATE_PRODUCT_IMPORT_UPLOAD = `
  mutation CreateProductImportUpload($input: CreateProductImportUploadInput!) {
    createProductImportUpload(input: $input) {
      job {
        ${PRODUCT_TRANSFER_JOB_FIELDS}
      }
      url
      fields {
        name
        value
      }
      expiresAt
    }
  }
`

const QUEUE_PRODUCT_IMPORT_VALIDATION = `
  mutation QueueProductImportValidation($jobId: ID!) {
    queueProductImportValidation(jobId: $jobId) {
      ${PRODUCT_TRANSFER_JOB_FIELDS}
    }
  }
`

const CONFIRM_PRODUCT_IMPORT = `
  mutation ConfirmProductImport($jobId: ID!) {
    confirmProductImport(jobId: $jobId) {
      ${PRODUCT_TRANSFER_JOB_FIELDS}
    }
  }
`

const CANCEL_PRODUCT_IMPORT = `
  mutation CancelProductImport($jobId: ID!) {
    cancelProductImport(jobId: $jobId) {
      ${PRODUCT_TRANSFER_JOB_FIELDS}
    }
  }
`

const CREATE_PRODUCT_EXPORT = `
  mutation CreateProductExport {
    createProductExport {
      ${PRODUCT_TRANSFER_JOB_FIELDS}
    }
  }
`

const CREATE_PRODUCT_TRANSFER_DOWNLOAD_URL = `
  mutation CreateProductTransferDownloadUrl(
    $jobId: ID!
    $artifact: ProductTransferArtifact!
  ) {
    createProductTransferDownloadUrl(jobId: $jobId, artifact: $artifact) {
      url
      expiresAt
    }
  }
`

export const getActiveProductTransfer = async (
  tenantId?: string
): Promise<ProductTransferJob | null> => {
  const data = await requestGraphQL<{
    activeProductTransferJob: ProductTransferJob | null
  }>(GET_ACTIVE_PRODUCT_TRANSFER, undefined, { tenantId })
  return data.activeProductTransferJob
}

export const getLatestProductTransfer = async (
  tenantId?: string
): Promise<ProductTransferJob | null> => {
  const data = await requestGraphQL<{
    latestProductTransferJob: ProductTransferJob | null
  }>(GET_LATEST_PRODUCT_TRANSFER, undefined, { tenantId })
  return data.latestProductTransferJob
}

export const getProductTransfer = async (
  id: string,
  tenantId?: string
): Promise<ProductTransferJob> => {
  const data = await requestGraphQL<{ productTransferJob: ProductTransferJob }>(
    GET_PRODUCT_TRANSFER,
    { id },
    { tenantId }
  )
  return data.productTransferJob
}

export const getCurrentProductTransfer = async (
  tenantId?: string
): Promise<ProductTransferJob | null> =>
  (await getActiveProductTransfer(tenantId)) ??
  getLatestProductTransfer(tenantId)

export const createProductImportUpload = async (
  file: File,
  tenantId?: string
): Promise<ProductTransferUploadAuthorization> => {
  const data = await requestGraphQL<{
    createProductImportUpload: ProductTransferUploadAuthorization
  }>(
    CREATE_PRODUCT_IMPORT_UPLOAD,
    { input: { fileName: file.name, fileSize: file.size } },
    { tenantId }
  )
  return data.createProductImportUpload
}

export const uploadProductImport = (
  authorization: ProductTransferUploadAuthorization,
  file: File,
  onProgress: (percentage: number) => void,
  signal?: AbortSignal
): Promise<void> =>
  new Promise((resolve, reject) => {
    const request = new XMLHttpRequest()
    const form = new FormData()
    for (const field of authorization.fields)
      form.append(field.name, field.value)
    form.append('file', file)

    const abort = () => request.abort()
    signal?.addEventListener('abort', abort, { once: true })

    request.upload.addEventListener('progress', (event) => {
      if (!event.lengthComputable) return
      onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)))
    })
    request.addEventListener('load', () => {
      signal?.removeEventListener('abort', abort)
      if (request.status >= 200 && request.status < 300) {
        onProgress(100)
        resolve()
        return
      }
      reject(
        new Error(`The workbook upload failed with status ${request.status}.`)
      )
    })
    request.addEventListener('error', () => {
      signal?.removeEventListener('abort', abort)
      reject(new Error('The workbook could not be uploaded.'))
    })
    request.addEventListener('abort', () => {
      signal?.removeEventListener('abort', abort)
      reject(
        new DOMException('The workbook upload was cancelled.', 'AbortError')
      )
    })
    request.open('POST', authorization.url)
    request.send(form)
  })

export const queueProductImportValidation = async (
  jobId: string,
  tenantId?: string
): Promise<ProductTransferJob> => {
  const data = await requestGraphQL<{
    queueProductImportValidation: ProductTransferJob
  }>(QUEUE_PRODUCT_IMPORT_VALIDATION, { jobId }, { tenantId })
  return data.queueProductImportValidation
}

export const confirmProductImport = async (
  jobId: string,
  tenantId?: string
): Promise<ProductTransferJob> => {
  const data = await requestGraphQL<{
    confirmProductImport: ProductTransferJob
  }>(CONFIRM_PRODUCT_IMPORT, { jobId }, { tenantId })
  return data.confirmProductImport
}

export const cancelProductImport = async (
  jobId: string,
  tenantId?: string
): Promise<ProductTransferJob> => {
  const data = await requestGraphQL<{
    cancelProductImport: ProductTransferJob
  }>(CANCEL_PRODUCT_IMPORT, { jobId }, { tenantId })
  return data.cancelProductImport
}

export const createProductExport = async (
  tenantId?: string
): Promise<ProductTransferJob> => {
  const data = await requestGraphQL<{
    createProductExport: ProductTransferJob
  }>(CREATE_PRODUCT_EXPORT, undefined, { tenantId })
  return data.createProductExport
}

export const createProductTransferDownloadUrl = async (
  jobId: string,
  artifact: ProductTransferArtifact,
  tenantId?: string
): Promise<ProductTransferDownloadAuthorization> => {
  const data = await requestGraphQL<{
    createProductTransferDownloadUrl: ProductTransferDownloadAuthorization
  }>(CREATE_PRODUCT_TRANSFER_DOWNLOAD_URL, { jobId, artifact }, { tenantId })
  return data.createProductTransferDownloadUrl
}
