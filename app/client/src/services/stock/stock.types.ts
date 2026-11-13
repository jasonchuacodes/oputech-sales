export enum StockUnit {
  KG = 'KG',
  G = 'G',
  L = 'L',
  ML = 'ML',
  PC = 'PC',
  GAL = 'GAL',
  BAG = 'BAG',
}

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
  unit: StockUnit
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
  unit: StockUnit
  openingQuantity: string
  note?: string
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

export const stockUnitLabels: Record<StockUnit, string> = {
  [StockUnit.KG]: 'kg',
  [StockUnit.G]: 'g',
  [StockUnit.L]: 'L',
  [StockUnit.ML]: 'mL',
  [StockUnit.PC]: 'pc',
  [StockUnit.GAL]: 'gal',
  [StockUnit.BAG]: 'bag',
}
