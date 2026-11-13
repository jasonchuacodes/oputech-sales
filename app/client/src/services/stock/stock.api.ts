import { requestGraphQL } from '@/lib/graphql'
import type {
  EnableStockTrackingInput,
  PageResult,
  ReceiveStockInput,
  ReconcileStockInput,
  StockMovement,
  StockMovementReason,
  StockUnitOption,
} from './stock.types'
import type { InventoryProduct } from '../product/product.types'

const INVENTORY_PRODUCT_FIELDS = `
  id
  name
  price
  imageUrl
  printCount
  inventory {
    stockCount
    unit
    revision
  }
`

const GET_MOVEMENTS = `
  query GetStockMovements(
    $filter: StockMovementFilterInput
    $pagination: StockPaginationInput
  ) {
    stockMovements(filter: $filter, pagination: $pagination) {
      items {
        id
        productId
        productName
        unit
        delta
        balanceBefore
        balanceAfter
        reason
        sourceId
        occurredAt
        postedAt
        note
        packageLabel
        packageCount
        quantityPerPackage
      }
      page
      pageSize
      totalCount
      totalPages
      hasNextPage
      hasPreviousPage
    }
  }
`

const GET_STOCK_UNIT_OPTIONS = `
  query GetStockUnitOptions {
    stockUnitOptions {
      label
    }
  }
`

export const getStockUnitOptions = async (
  tenantId?: string
): Promise<StockUnitOption[]> => {
  const data = await requestGraphQL<{
    stockUnitOptions: StockUnitOption[]
  }>(GET_STOCK_UNIT_OPTIONS, undefined, { tenantId })
  return data.stockUnitOptions
}

const CREATE_STOCK_UNIT_OPTION = `
  mutation CreateStockUnitOption($input: CreateStockUnitOptionInput!) {
    createStockUnitOption(input: $input) {
      label
    }
  }
`

export const createStockUnitOption = async (
  label: string,
  tenantId?: string
): Promise<StockUnitOption> => {
  const data = await requestGraphQL<{
    createStockUnitOption: StockUnitOption
  }>(CREATE_STOCK_UNIT_OPTION, { input: { label } }, { tenantId })
  return data.createStockUnitOption
}

export const getStockMovements = async (
  page: number,
  productId?: string,
  reason?: StockMovementReason,
  tenantId?: string
): Promise<PageResult<StockMovement>> => {
  const data = await requestGraphQL<{
    stockMovements: PageResult<StockMovement>
  }>(
    GET_MOVEMENTS,
    {
      filter:
        productId || reason
          ? { productId: productId || undefined, reason: reason || undefined }
          : undefined,
      pagination: { page, pageSize: 25 },
    },
    { tenantId }
  )
  return data.stockMovements
}

const ENABLE_TRACKING = `
  mutation EnableStockTracking($input: EnableStockTrackingInput!) {
    enableStockTracking(input: $input) { ${INVENTORY_PRODUCT_FIELDS} }
  }
`

export const enableStockTracking = async (
  input: EnableStockTrackingInput,
  tenantId?: string
): Promise<InventoryProduct> => {
  const data = await requestGraphQL<{ enableStockTracking: InventoryProduct }>(
    ENABLE_TRACKING,
    { input },
    { tenantId }
  )
  return data.enableStockTracking
}

const RECEIVE_STOCK = `
  mutation ReceiveStock($input: ReceiveStockInput!) {
    receiveStock(input: $input) { ${INVENTORY_PRODUCT_FIELDS} }
  }
`

export const receiveStock = async (
  input: ReceiveStockInput,
  tenantId?: string
): Promise<InventoryProduct> => {
  const data = await requestGraphQL<{ receiveStock: InventoryProduct }>(
    RECEIVE_STOCK,
    { input },
    { tenantId }
  )
  return data.receiveStock
}

const RECONCILE_STOCK = `
  mutation ReconcileStock($input: ReconcileStockInput!) {
    reconcileStock(input: $input) { ${INVENTORY_PRODUCT_FIELDS} }
  }
`

export const reconcileStock = async (
  input: ReconcileStockInput,
  tenantId?: string
): Promise<InventoryProduct> => {
  const data = await requestGraphQL<{ reconcileStock: InventoryProduct }>(
    RECONCILE_STOCK,
    { input },
    { tenantId }
  )
  return data.reconcileStock
}
