export enum StockMovementReason {
  Opening = 'OPENING',
  Receipt = 'RECEIPT',
  Sale = 'SALE',
  Void = 'VOID',
  Correction = 'CORRECTION',
}

export interface StockMovement {
  id: string
  productId: string
  productName: string
  unit: string
  delta: string
  balanceBefore: string
  balanceAfter: string
  reason: StockMovementReason
  sourceId: string
  occurredAt: string
  postedAt: string
  note?: string
  packageLabel?: string
  packageCount?: string
  quantityPerPackage?: string
}

export interface PageResult<T> {
  items: T[]
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
  note?: string
}

export interface StockUnitOption {
  label: string
}

export interface ReceiveStockInput {
  clientMutationId: string
  productId: string
  packageCount: string
  quantityPerPackage: string
  packageLabel?: string
  note?: string
}

export interface ReconcileStockInput {
  clientMutationId: string
  productId: string
  countedQuantity: string
  expectedRevision: number
  note: string
}

const legacyStockUnitLabels: Record<string, string> = {
  KG: 'kg',
  G: 'g',
  L: 'L',
  ML: 'mL',
  PC: 'pc',
  GAL: 'gal',
  BAG: 'bag',
}

export const formatStockUnit = (unit: string): string =>
  legacyStockUnitLabels[unit] ?? unit
