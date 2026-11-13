'use client'
/* eslint-disable @next/next/no-img-element */

import { useState } from 'react'
import { ImageOff, Plus, Search } from 'lucide-react'
import { Button, ContentSection, Input, PageHeader } from '../../components'
import { DataTable, DataTableColumn } from '../../components/ui/data-table'
import { useProductPage } from '../../services/product/product.queries'
import { Product } from '../../services/product/product.types'
import { formatCurrency } from '../../utils/number'
import { useAuthContext } from '../../context/auth/useAuthContext'
import { UserRole } from '../../types'
import { AddItemModal } from './components/AddItemModal'
import { EditItemModal } from './components/EditItemModal'
import { DeleteConfirmModal } from './components/DeleteConfirmModal'
import { ActionsDropdown } from './components/ActionsDropdown'
import { useSyncContext } from '../../context/sync/useSyncContext'
import { useDisclosure } from '../../hooks/useDisclosure'
import { useTenantContext } from '../../context/tenant/useTenantContext'
import { formatStockUnit } from '../../services/stock/stock.types'
import { TenantType } from '../../services/tenant/tenant.types'
import {
  InventoryOperationModal,
  type InventoryOperationMode,
} from './components/InventoryOperationModal'
import { InventoryMovementHistory } from './components/InventoryMovementHistory'

const formatStockCount = (value: string) =>
  Number(value).toLocaleString(undefined, { maximumFractionDigits: 6 })

const stockCountLabel = (product: Product) =>
  product.inventory
    ? formatStockCount(product.inventory.stockCount)
    : 'Not tracked'

const unitLabel = (product: Product) =>
  product.inventory ? formatStockUnit(product.inventory.unit) : '—'

const ProductPageContent = ({
  showPrintCount,
}: {
  showPrintCount: boolean
}) => {
  const { auth } = useAuthContext()
  const isAdmin = auth?.role !== UserRole.STAFF
  const { canModifyProducts, pendingCount, blockedCount } = useSyncContext()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const addItem = useDisclosure()
  const [selectedItem, setSelectedItem] = useState<Product | null>(null)
  const [inventoryProduct, setInventoryProduct] = useState<Product | null>(null)
  const [inventoryMode, setInventoryMode] =
    useState<InventoryOperationMode>('setup')
  const [movementProduct, setMovementProduct] = useState<Product | null>(null)
  const editItem = useDisclosure()
  const deleteItem = useDisclosure()
  const inventoryOperation = useDisclosure()
  const movementHistory = useDisclosure()

  const productsQuery = useProductPage(search, page)
  const { data, isLoading, isFetching } = productsQuery
  const products = data?.items ?? []

  const openEdit = (item: Product) => {
    setSelectedItem(item)
    editItem.onOpen()
  }

  const openDelete = (item: Product) => {
    setSelectedItem(item)
    deleteItem.onOpen()
  }

  const openInventoryOperation = (
    item: Product,
    mode: InventoryOperationMode
  ) => {
    setInventoryProduct(item)
    setInventoryMode(mode)
    inventoryOperation.onOpen()
  }

  const openMovementHistory = (item: Product) => {
    setMovementProduct(item)
    movementHistory.onOpen()
  }

  const productActions = (item: Product) => (
    <ActionsDropdown
      canModifyProducts={canModifyProducts}
      onEdit={() => openEdit(item)}
      onDelete={() => openDelete(item)}
      onSetupStock={
        item.inventory ? undefined : () => openInventoryOperation(item, 'setup')
      }
      onReceiveStock={
        item.inventory
          ? () => openInventoryOperation(item, 'receive')
          : undefined
      }
      onReconcileStock={
        item.inventory
          ? () => openInventoryOperation(item, 'reconcile')
          : undefined
      }
      onViewMovements={
        item.inventory ? () => openMovementHistory(item) : undefined
      }
    />
  )

  const columns: DataTableColumn<Product>[] = [
    {
      id: 'name',
      heading: 'Product',
      cell: (item) => (
        <div className="flex items-center gap-3">
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt=""
              className="size-12 shrink-0 rounded-md object-cover"
            />
          ) : (
            <div className="bg-muted flex size-12 shrink-0 items-center justify-center rounded-md">
              <ImageOff size={16} className="text-muted-foreground" />
            </div>
          )}
          <span className="min-w-0 truncate">{item.name}</span>
        </div>
      ),
      width: 320,
    },
    {
      id: 'unit',
      heading: 'Unit',
      cell: (item) => (
        <span className={item.inventory ? 'font-medium' : 'text-text-tertiary'}>
          {unitLabel(item)}
        </span>
      ),
    },
    {
      id: 'stockCount',
      heading: 'Stock count',
      align: 'right',
      cell: (item) => (
        <span
          className={
            item.inventory && Number(item.inventory.stockCount) < 0
              ? 'text-destructive font-medium'
              : item.inventory
                ? 'font-medium'
                : 'text-text-tertiary'
          }
        >
          {stockCountLabel(item)}
        </span>
      ),
    },
    {
      id: 'price',
      heading: 'Price',
      align: 'right',
      cell: (item) => formatCurrency(item.price),
    },
    ...(showPrintCount
      ? [
          {
            id: 'printCount',
            heading: 'Print count',
            align: 'right' as const,
            cell: (item: Product) => (item.printCount ?? 0).toLocaleString(),
          },
        ]
      : []),
    {
      id: 'actions',
      heading: '',
      align: 'right',
      cell: (item) => (
        <div className="flex items-center justify-end gap-1">
          {isAdmin && productActions(item)}
        </div>
      ),
    },
  ]

  const collection = DataTable.collection({
    items: products,
    itemToValue: (item) => item.id,
    itemToString: (item) => item.name,
  })

  const renderMobileProducts = (items: Product[]) => {
    if (isLoading) {
      return (
        <div className="rounded-card bg-card shadow-card h-28 animate-pulse" />
      )
    }

    if (items.length === 0 && !productsQuery.isError) {
      return (
        <div className="rounded-card bg-card text-text-secondary shadow-card p-4 text-center text-sm">
          No items found
        </div>
      )
    }

    return (
      <ul className="rounded-card bg-card shadow-card overflow-hidden">
        {items.map((item) => (
          <li
            key={item.id}
            className="border-border/60 flex min-h-20 items-center gap-3 border-b p-3 last:border-b-0"
          >
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt=""
                className="size-10 shrink-0 rounded-md object-cover"
              />
            ) : (
              <span className="bg-muted text-text-secondary flex size-10 shrink-0 items-center justify-center rounded-md">
                <ImageOff className="size-5" aria-hidden="true" />
              </span>
            )}
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-text-heading truncate font-medium">
                {item.name}
              </span>
              {item.inventory && (
                <span className="text-text-secondary text-sm">
                  <span
                    className={
                      Number(item.inventory.stockCount) < 0
                        ? 'text-destructive'
                        : undefined
                    }
                  >
                    {stockCountLabel(item)}
                  </span>
                  {` · ${unitLabel(item)}`}
                </span>
              )}
              {showPrintCount && (
                <span className="text-text-tertiary text-sm">
                  {(item.printCount ?? 0).toLocaleString()}{' '}
                  {item.printCount === 1 ? 'print' : 'prints'}
                </span>
              )}
            </span>
            <span className="flex shrink-0 items-center gap-1">
              <span className="flex flex-col items-end gap-1">
                <span className="font-semibold whitespace-nowrap">
                  {formatCurrency(item.price)}
                </span>
              </span>
              {isAdmin && productActions(item)}
            </span>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-5 py-5 md:p-6">
      <PageHeader
        title="Products"
        description="Manage products, pricing, stock, and movement history"
        action={
          isAdmin && (
            <Button className="gap-2" onClick={addItem.onOpen}>
              <Plus size={16} />
              Add Item
            </Button>
          )
        }
      />

      {!canModifyProducts &&
        isAdmin &&
        (pendingCount > 0 || blockedCount > 0) && (
          <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Existing products can be edited or deleted after pending
            transactions are synced. New products can still be added while
            connected.
          </p>
        )}

      <div className="relative w-full md:max-w-sm">
        <Search
          aria-hidden="true"
          className="text-text-tertiary pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
        />
        <Input
          placeholder="Search by name"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="pl-9"
        />
      </div>

      {productsQuery.source === 'cache' && (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Showing the latest products saved on this device. Reconnect to refresh
          products and stock counts.
        </p>
      )}

      {productsQuery.isError && !data && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <p>
            {productsQuery.error instanceof Error
              ? productsQuery.error.message
              : 'Products could not be loaded.'}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => void productsQuery.refetch()}
          >
            Retry
          </Button>
        </div>
      )}

      {productsQuery.fetchStatus === 'paused' && !data && (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Products will load when the connection is restored.
        </p>
      )}

      <ContentSection
        label="Products"
        rightContent={
          !isLoading ? (
            <span className="text-text-tertiary text-sm">
              {data?.totalCount ?? 0}{' '}
              {data?.totalCount === 1 ? 'item' : 'items'}
            </span>
          ) : undefined
        }
      >
        <div className="md:hidden">{renderMobileProducts(products)}</div>
        <div className="hidden md:block">
          <DataTable
            collection={collection}
            columns={columns}
            loading={isLoading}
            emptyMessage="No items found"
          />
        </div>
        {!isLoading &&
          !productsQuery.isError &&
          (data?.totalPages ?? 0) > 1 && (
            <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
              <p className="text-text-secondary text-sm">
                {((data?.page ?? 1) - 1) * (data?.pageSize ?? 0) + 1}–
                {Math.min(
                  (data?.page ?? 1) * (data?.pageSize ?? 0),
                  data?.totalCount ?? 0
                )}{' '}
                of {data?.totalCount ?? 0} products · Page {data?.page} of{' '}
                {data?.totalPages}
              </p>
              <div className="flex w-full gap-2 sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1 sm:flex-none"
                  disabled={!data?.hasPreviousPage || isFetching}
                  onClick={() => setPage((data?.page ?? page) - 1)}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1 sm:flex-none"
                  disabled={!data?.hasNextPage || isFetching}
                  onClick={() => setPage((data?.page ?? page) + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
      </ContentSection>

      <AddItemModal
        key={addItem.open ? 'add-open' : 'add-closed'}
        open={isAdmin && addItem.open}
        showPrintCount={showPrintCount}
        onClose={addItem.onClose}
      />

      <EditItemModal
        key={selectedItem?.id ?? 'edit-none'}
        item={selectedItem}
        open={editItem.open}
        showPrintCount={showPrintCount}
        onClose={() => {
          editItem.onClose()
          setSelectedItem(null)
        }}
      />

      <DeleteConfirmModal
        item={selectedItem}
        open={deleteItem.open}
        onClose={() => {
          deleteItem.onClose()
          setSelectedItem(null)
        }}
      />

      {inventoryProduct && (
        <InventoryOperationModal
          key={`${inventoryProduct.id}:${inventoryMode}:${inventoryOperation.open}`}
          mode={inventoryMode}
          open={inventoryOperation.open}
          product={inventoryProduct}
          onClose={() => {
            inventoryOperation.onClose()
            setInventoryProduct(null)
          }}
        />
      )}

      {movementProduct && (
        <InventoryMovementHistory
          key={`${movementProduct.id}:${movementHistory.open}`}
          open={movementHistory.open}
          product={movementProduct}
          onClose={() => {
            movementHistory.onClose()
            setMovementProduct(null)
          }}
        />
      )}
    </div>
  )
}

const ProductPage = () => {
  const { currentTenant } = useTenantContext()
  return (
    <ProductPageContent
      key={currentTenant?.id ?? 'no-tenant'}
      showPrintCount={currentTenant?.type === TenantType.PHOTO}
    />
  )
}

export default ProductPage
