'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, Search } from 'lucide-react'
import { Button, Input, PageHeader, SheetSelect } from '@/components'
import { DataTable, type DataTableColumn } from '@/components/ui/data-table'
import { useTenantContext } from '@/context/tenant/useTenantContext'
import { useDisclosure } from '@/hooks/useDisclosure'
import { getAllProducts } from '@/services/product/product.api'
import { productKeys } from '@/services/product/product.queries'
import {
  useStockMovements,
  useStocks,
} from '@/services/stock/stock.queries'
import {
  StockMovementReason,
  stockUnitLabels,
  type Stock,
  type StockMovement,
} from '@/services/stock/stock.types'
import { formatTime } from '@/utils/date'
import {
  StockOperationModal,
  type StockOperationMode,
} from './components/StockOperationModal'
import { StockActionsDropdown } from './components/StockActionsDropdown'

const quantity = (value: string) =>
  Number(value).toLocaleString(undefined, { maximumFractionDigits: 6 })

const reasonLabels: Record<StockMovementReason, string> = {
  [StockMovementReason.Opening]: 'Opening count',
  [StockMovementReason.Receipt]: 'Receipt',
  [StockMovementReason.Sale]: 'Sale',
  [StockMovementReason.Void]: 'Sale void',
  [StockMovementReason.Correction]: 'Count correction',
}

const StockPage = () => {
  const { currentTenant } = useTenantContext()
  const tenantId = currentTenant?.id
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'stock' | 'history'>('stock')
  const [stockPage, setStockPage] = useState(1)
  const [movementPage, setMovementPage] = useState(1)
  const [movementProductId, setMovementProductId] = useState('')
  const [movementReason, setMovementReason] = useState('')
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null)
  const [operationMode, setOperationMode] = useState<StockOperationMode>('setup')
  const operation = useDisclosure()
  const stocks = useStocks(search, stockPage)
  const movements = useStockMovements(
    movementPage,
    movementProductId || undefined,
    (movementReason || undefined) as StockMovementReason | undefined,
    activeTab === 'history',
  )
  const products = useQuery({
    queryKey: [...productKeys.tenant(tenantId), 'all-for-stock'],
    queryFn: () => getAllProducts(tenantId),
    enabled: !!tenantId,
  })

  const openOperation = (mode: StockOperationMode, stock?: Stock) => {
    setOperationMode(mode)
    setSelectedStock(stock ?? null)
    operation.onOpen()
  }

  const stockColumns: DataTableColumn<Stock>[] = [
    {
      id: 'product',
      heading: 'Product',
      cell: (stock) => <span className="font-medium">{stock.product.name}</span>,
    },
    {
      id: 'quantity',
      heading: 'On hand',
      cell: (stock) => (
        <span className={Number(stock.quantity) < 0 ? 'font-semibold text-destructive' : 'font-semibold'}>
          {quantity(stock.quantity)} {stockUnitLabels[stock.unit]}
        </span>
      ),
    },
    {
      id: 'actions',
      heading: '',
      align: 'right',
      width: 64,
      cell: (stock) => (
        <div className="flex justify-end">
          <StockActionsDropdown
            productName={stock.product.name}
            onCount={() => openOperation('reconcile', stock)}
            onReceive={() => openOperation('receive', stock)}
          />
        </div>
      ),
    },
  ]

  const movementColumns: DataTableColumn<StockMovement>[] = [
    {
      id: 'productName',
      heading: 'Product',
      cell: (movement) => movement.productName,
    },
    {
      id: 'reason',
      heading: 'Reason',
      cell: (movement) => reasonLabels[movement.reason],
    },
    {
      id: 'delta',
      heading: 'Change',
      cell: (movement) => (
        <span className={Number(movement.delta) < 0 ? 'text-destructive' : 'text-emerald-700'}>
          {Number(movement.delta) > 0 ? '+' : ''}{quantity(movement.delta)}{' '}
          {stockUnitLabels[movement.unit]}
        </span>
      ),
    },
    {
      id: 'balanceAfter',
      heading: 'Balance after',
      cell: (movement) => `${quantity(movement.balanceAfter)} ${stockUnitLabels[movement.unit]}`,
    },
    {
      id: 'postedAt',
      heading: 'Posted',
      cell: (movement) => formatTime(movement.postedAt, 'MMM D, h:mm A'),
    },
  ]

  const stockItems = stocks.data?.items ?? []
  const movementItems = movements.data?.items ?? []
  const trackedProducts = (products.data ?? []).filter(
    (product) => product.stockTrackingEnabled,
  )

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-5 py-5 md:p-6">
      <PageHeader
        title="Stock management"
        description="Receive inventory, reconcile physical counts, and review movement history"
        action={
          <Button className="gap-2" onClick={() => openOperation('setup')}>
            <Plus className="size-4" />
            Set up stock
          </Button>
        }
      />

      <div
        role="tablist"
        aria-label="Stock management views"
        className="border-border flex gap-6 border-b"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'stock'}
          className={
            activeTab === 'stock'
              ? 'border-primary text-primary -mb-px border-b-2 px-0.5 pb-2 text-sm font-medium'
              : 'text-text-tertiary hover:text-foreground -mb-px border-b-2 border-transparent px-0.5 pb-2 text-sm font-medium transition-colors'
          }
          onClick={() => setActiveTab('stock')}
        >
          Stock
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'history'}
          className={
            activeTab === 'history'
              ? 'border-primary text-primary -mb-px border-b-2 px-0.5 pb-2 text-sm font-medium'
              : 'text-text-tertiary hover:text-foreground -mb-px border-b-2 border-transparent px-0.5 pb-2 text-sm font-medium transition-colors'
          }
          onClick={() => setActiveTab('history')}
        >
          Movement history
        </button>
      </div>

      {activeTab === 'stock' ? (
        <div role="tabpanel" className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div className="relative w-full md:max-w-sm">
              <Search className="text-text-tertiary pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                value={search}
                placeholder="Search tracked products"
                className="pl-9"
                onChange={(event) => {
                  setSearch(event.target.value)
                  setStockPage(1)
                }}
              />
            </div>
            <span className="text-text-tertiary text-sm">
              {stocks.data?.totalCount ?? 0} tracked
            </span>
          </div>
          {stocks.isError && (
            <ErrorMessage
              message={stocks.error.message}
              retry={() => void stocks.refetch()}
            />
          )}
          <div className="md:hidden">
            <MobileStockList
              items={stockItems}
              loading={stocks.isLoading}
              onCount={(stock) => openOperation('reconcile', stock)}
              onReceive={(stock) => openOperation('receive', stock)}
            />
          </div>
          <div className="hidden md:block">
            <DataTable
              collection={DataTable.collection({
                items: stockItems,
                itemToValue: (stock) => stock.id,
                itemToString: (stock) => stock.product.name,
              })}
              columns={stockColumns}
              loading={stocks.isLoading}
              emptyMessage="No products have stock tracking enabled"
              compact
            />
          </div>
          <Pagination
            page={stocks.data?.page ?? 1}
            hasPrevious={stocks.data?.hasPreviousPage ?? false}
            hasNext={stocks.data?.hasNextPage ?? false}
            loading={stocks.isFetching}
            onPage={setStockPage}
          />
        </div>
      ) : (
        <div role="tabpanel" className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <SheetSelect
              title="Filter by product"
              value={movementProductId}
              onValueChange={(value) => {
                setMovementProductId(value === 'ALL' ? '' : value)
                setMovementPage(1)
              }}
              displayValue={
                movementProductId
                  ? trackedProducts.find(
                      (product) => product.id === movementProductId,
                    )?.name
                  : 'All products'
              }
              options={[
                { value: 'ALL', label: 'All products' },
                ...trackedProducts.map((product) => ({
                  value: product.id,
                  label: product.name,
                })),
              ]}
            />
            <SheetSelect
              title="Filter by reason"
              value={movementReason}
              onValueChange={(value) => {
                setMovementReason(value === 'ALL' ? '' : value)
                setMovementPage(1)
              }}
              displayValue={
                movementReason
                  ? reasonLabels[movementReason as StockMovementReason]
                  : 'All movement types'
              }
              options={[
                { value: 'ALL', label: 'All movement types' },
                ...Object.values(StockMovementReason).map((reason) => ({
                  value: reason,
                  label: reasonLabels[reason],
                })),
              ]}
            />
          </div>
          {movements.isError && (
            <ErrorMessage
              message={movements.error.message}
              retry={() => void movements.refetch()}
            />
          )}
          <div className="md:hidden">
            <MobileMovementList
              items={movementItems}
              loading={movements.isLoading}
            />
          </div>
          <div className="hidden md:block">
            <DataTable
              collection={DataTable.collection({
                items: movementItems,
                itemToValue: (movement) => movement.id,
                itemToString: (movement) =>
                  `${movement.productName} ${movement.reason}`,
              })}
              columns={movementColumns}
              loading={movements.isLoading}
              emptyMessage="No stock movements found"
            />
          </div>
          <Pagination
            page={movements.data?.page ?? 1}
            hasPrevious={movements.data?.hasPreviousPage ?? false}
            hasNext={movements.data?.hasNextPage ?? false}
            loading={movements.isFetching}
            onPage={setMovementPage}
          />
        </div>
      )}

      <StockOperationModal
        key={`${operationMode}:${selectedStock?.id ?? 'new'}:${operation.open}`}
        mode={operationMode}
        open={operation.open}
        products={products.data ?? []}
        stock={selectedStock}
        onClose={operation.onClose}
      />
    </div>
  )
}

const Pagination = ({
  page,
  hasPrevious,
  hasNext,
  loading,
  onPage,
}: {
  page: number
  hasPrevious: boolean
  hasNext: boolean
  loading: boolean
  onPage: (page: number) => void
}) => {
  if (!hasPrevious && !hasNext) return null
  return (
    <div className="mt-3 flex items-center justify-end gap-2">
      <Button size="sm" variant="outline" disabled={!hasPrevious || loading} onClick={() => onPage(page - 1)}>
        Previous
      </Button>
      <span className="text-text-tertiary text-sm">Page {page}</span>
      <Button size="sm" variant="outline" disabled={!hasNext || loading} onClick={() => onPage(page + 1)}>
        Next
      </Button>
    </div>
  )
}

const MobileStockList = ({
  items,
  loading,
  onCount,
  onReceive,
}: {
  items: Stock[]
  loading: boolean
  onCount: (stock: Stock) => void
  onReceive: (stock: Stock) => void
}) => {
  if (loading) {
    return <div className="rounded-card bg-card h-24 animate-pulse shadow-card" />
  }
  if (items.length === 0) {
    return (
      <div className="rounded-card bg-card p-4 text-center text-sm text-text-secondary shadow-card">
        No products have stock tracking enabled
      </div>
    )
  }
  return (
    <ul className="rounded-card bg-card overflow-hidden shadow-card">
      {items.map((stock) => (
        <li
          key={stock.id}
          className="border-border/60 flex min-h-16 items-center gap-3 border-b px-3 py-2.5 last:border-b-0"
        >
          <span className="min-w-0 flex-1">
            <span className="text-text-heading block truncate font-medium">
              {stock.product.name}
            </span>
            <span
              className={
                Number(stock.quantity) < 0
                  ? 'text-destructive block text-sm font-semibold'
                  : 'text-text-tertiary block text-sm font-semibold'
              }
            >
              {quantity(stock.quantity)} {stockUnitLabels[stock.unit]}
            </span>
          </span>
          <StockActionsDropdown
            productName={stock.product.name}
            onCount={() => onCount(stock)}
            onReceive={() => onReceive(stock)}
          />
        </li>
      ))}
    </ul>
  )
}

const MobileMovementList = ({
  items,
  loading,
}: {
  items: StockMovement[]
  loading: boolean
}) => {
  if (loading) {
    return <div className="rounded-card bg-card h-28 animate-pulse shadow-card" />
  }
  if (items.length === 0) {
    return (
      <div className="rounded-card bg-card p-4 text-center text-sm text-text-secondary shadow-card">
        No stock movements found
      </div>
    )
  }
  return (
    <ul className="rounded-card bg-card overflow-hidden shadow-card">
      {items.map((movement) => (
        <li
          key={movement.id}
          className="border-border/60 flex min-h-20 items-center gap-3 border-b p-3 last:border-b-0"
        >
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-text-heading truncate font-medium">
              {movement.productName}
            </span>
            <span className="text-text-tertiary truncate text-sm">
              {reasonLabels[movement.reason]} ·{' '}
              {formatTime(movement.postedAt, 'MMM D, h:mm A')}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-1">
            <span className="flex flex-col items-end gap-1">
              <span
                className={
                  Number(movement.delta) < 0
                    ? 'text-destructive font-semibold whitespace-nowrap'
                    : 'text-emerald-700 font-semibold whitespace-nowrap'
                }
              >
                {Number(movement.delta) > 0 ? '+' : ''}
                {quantity(movement.delta)} {stockUnitLabels[movement.unit]}
              </span>
              <span className="text-text-tertiary text-xs whitespace-nowrap">
                Balance {quantity(movement.balanceAfter)}{' '}
                {stockUnitLabels[movement.unit]}
              </span>
            </span>
          </span>
        </li>
      ))}
    </ul>
  )
}

const ErrorMessage = ({ message, retry }: { message: string; retry: () => void }) => (
  <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
    <p>{message}</p>
    <Button size="sm" variant="outline" className="mt-2" onClick={retry}>
      Retry
    </Button>
  </div>
)

export default StockPage
