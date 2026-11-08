import { requestGraphQL } from '@/lib/graphql'
import type {
  EnableStockTrackingInput,
  PageResult,
  ReceiveStockInput,
  ReconcileStockInput,
  Stock,
  StockMovement,
  StockMovementReason,
} from './stock.types'

const STOCK_FIELDS = `
  id
  productId
  quantity
  unit
  sequence
  product {
    id
    name
    price
    imageUrl
    printCount
    stockTrackingEnabled
  }
`

const GET_STOCKS = `
  query GetStocks($search: String, $pagination: StockPaginationInput) {
    stocks(search: $search, pagination: $pagination) {
      items { ${STOCK_FIELDS} }
      page
      pageSize
      totalCount
      totalPages
      hasNextPage
      hasPreviousPage
    }
  }
`

export const getStocks = async (
  search: string,
  page: number,
  tenantId?: string,
): Promise<PageResult<Stock>> => {
  const data = await requestGraphQL<{ stocks: PageResult<Stock> }>(
    GET_STOCKS,
    { search: search.trim() || undefined, pagination: { page, pageSize: 25 } },
    { tenantId },
  )
  return data.stocks
}

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

export const getStockMovements = async (
  page: number,
  productId?: string,
  reason?: StockMovementReason,
  tenantId?: string,
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
    { tenantId },
  )
  return data.stockMovements
}

const ENABLE_TRACKING = `
  mutation EnableStockTracking($input: EnableStockTrackingInput!) {
    enableStockTracking(input: $input) { ${STOCK_FIELDS} }
  }
`

export const enableStockTracking = async (
  input: EnableStockTrackingInput,
  tenantId?: string,
): Promise<Stock> => {
  const data = await requestGraphQL<{ enableStockTracking: Stock }>(
    ENABLE_TRACKING,
    { input },
    { tenantId },
  )
  return data.enableStockTracking
}

const RECEIVE_STOCK = `
  mutation ReceiveStock($input: ReceiveStockInput!) {
    receiveStock(input: $input) { ${STOCK_FIELDS} }
  }
`

export const receiveStock = async (
  input: ReceiveStockInput,
  tenantId?: string,
): Promise<Stock> => {
  const data = await requestGraphQL<{ receiveStock: Stock }>(
    RECEIVE_STOCK,
    { input },
    { tenantId },
  )
  return data.receiveStock
}

const RECONCILE_STOCK = `
  mutation ReconcileStock($input: ReconcileStockInput!) {
    reconcileStock(input: $input) { ${STOCK_FIELDS} }
  }
`

export const reconcileStock = async (
  input: ReconcileStockInput,
  tenantId?: string,
): Promise<Stock> => {
  const data = await requestGraphQL<{ reconcileStock: Stock }>(
    RECONCILE_STOCK,
    { input },
    { tenantId },
  )
  return data.reconcileStock
}
