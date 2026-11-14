export const PRODUCT_TRANSFER_QUEUE = 'product-transfer'

export const ProductTransferJobName = {
  VALIDATE_IMPORT: 'validate-import',
  APPLY_IMPORT: 'apply-import',
  GENERATE_EXPORT: 'generate-export',
} as const

export const PRODUCT_TRANSFER_WORKSHEET = 'Products'
export const PRODUCT_TRANSFER_HEADERS = [
  'Product ID',
  'Product Name',
  'Price',
  'Unit',
  'Quantity',
] as const

export const MAX_PRODUCT_TRANSFER_ROWS = 5_000
export const MAX_PRODUCT_TRANSFER_FILE_BYTES = 5 * 1024 * 1024
export const PRODUCT_TRANSFER_UPLOAD_TTL_SECONDS = 15 * 60
export const PRODUCT_TRANSFER_DOWNLOAD_TTL_SECONDS = 5 * 60
export const PRODUCT_TRANSFER_STAGING_TTL_DAYS = 8
export const PRODUCT_TRANSFER_FILE_TTL_DAYS = 7

export const PRODUCT_TRANSFER_CONTENT_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
