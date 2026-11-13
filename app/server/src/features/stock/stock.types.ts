import {
  StockMovementDocument,
  StockMovementReason,
  StockMovementSourceType,
} from './schemas/stock-movement.schema'

export interface StockPagination {
  page?: number
  pageSize?: number
}

export interface StockMovementFilter {
  productId?: string
  reason?: StockMovementReason
  sourceType?: StockMovementSourceType
}

export interface StockMovementPageResult {
  items: StockMovementDocument[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export interface EnableStockTrackingInput {
  clientMutationId: string
  productId: string
  unit: string
  openingQuantity: string
  occurredAt?: string
  note?: string
}

export interface ReceiveStockInput {
  clientMutationId: string
  productId: string
  packageCount: string
  quantityPerPackage: string
  packageLabel?: string
  occurredAt?: string
  note?: string
}

export interface ReconcileStockInput {
  clientMutationId: string
  productId: string
  countedQuantity: string
  expectedRevision: number
  occurredAt?: string
  note: string
}
