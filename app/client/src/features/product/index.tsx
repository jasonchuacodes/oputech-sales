'use client'
/* eslint-disable @next/next/no-img-element */

import { useState } from 'react'
import { ImageOff, Plus, Search } from 'lucide-react'
import { Button, ContentSection, Input, PageHeader } from '../../components'
import { DataTable, DataTableColumn } from '../../components/ui/data-table'
import { useProducts } from '../../services/product/product.queries'
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

const ProductPage = () => {
  const { auth } = useAuthContext()
  const isAdmin = auth?.role !== UserRole.STAFF
  const { canModifyCatalog, pendingCount, blockedCount } = useSyncContext()

  const [search, setSearch] = useState('')
  const addItem = useDisclosure()
  const [selectedItem, setSelectedItem] = useState<Product | null>(null)
  const editItem = useDisclosure()
  const deleteItem = useDisclosure()

  const { data, isLoading } = useProducts(search || undefined)

  const openEdit = (item: Product) => {
    setSelectedItem(item)
    editItem.onOpen()
  }

  const openDelete = (item: Product) => {
    setSelectedItem(item)
    deleteItem.onOpen()
  }

  const columns: DataTableColumn<Product>[] = [
    {
      id: 'name',
      heading: 'Name',
      cell: (item) => item.name,
      width: 320,
      orderable: true,
    },
    {
      id: 'image',
      heading: '',
      width: 48,
      cell: (item) =>
        item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt=""
            className="h-10 w-10 rounded-md object-cover"
          />
        ) : (
          <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-md">
            <ImageOff size={16} className="text-muted-foreground" />
          </div>
        ),
    },
    {
      id: 'price',
      heading: 'Price',
      cell: (item) => formatCurrency(item.price),
      orderable: true,
    },
    {
      id: 'actions',
      heading: '',
      align: 'right',
      cell: (item) => (
        <div className="flex items-center justify-end gap-1">
          {isAdmin && canModifyCatalog && (
            <ActionsDropdown
              onEdit={() => openEdit(item)}
              onDelete={() => openDelete(item)}
            />
          )}
        </div>
      ),
    },
  ]

  const mainProducts = (data ?? []).filter((item) => item.category === 'main')
  const addOnProducts = (data ?? []).filter(
    (item) => item.category === 'add-on'
  )

  const mainCollection = DataTable.collection({
    items: mainProducts,
    itemToValue: (item) => item.id,
    itemToString: (item) => item.name,
  })

  const addOnCollection = DataTable.collection({
    items: addOnProducts,
    itemToValue: (item) => item.id,
    itemToString: (item) => item.name,
  })

  const renderMobileProducts = (items: Product[]) => {
    if (isLoading) {
      return <div className="rounded-card bg-card h-28 animate-pulse shadow-card" />
    }

    if (items.length === 0) {
      return (
        <div className="rounded-card bg-card p-4 text-center text-sm text-text-secondary shadow-card">
          No items found
        </div>
      )
    }

    return (
      <ul className="rounded-card bg-card overflow-hidden shadow-card">
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
              <span className="text-text-heading truncate font-medium">{item.name}</span>
              <span className="text-text-tertiary text-sm">
                {(item.printCount ?? 0).toLocaleString()}{' '}
                {item.printCount === 1 ? 'print' : 'prints'}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-1">
              <span className="flex flex-col items-end gap-1">
                <span className="font-semibold whitespace-nowrap">
                  {formatCurrency(item.price)}
                </span>
              </span>
              {isAdmin && canModifyCatalog && (
                <ActionsDropdown
                  onEdit={() => openEdit(item)}
                  onDelete={() => openDelete(item)}
                />
              )}
            </span>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-5 py-5 md:p-6">
      <PageHeader
        title="Product catalog"
        description="Manage products, pricing, and images"
        action={
          isAdmin && (
            <Button
              className="gap-2"
              onClick={addItem.onOpen}
            >
              <Plus size={16} />
              Add Item
            </Button>
          )
        }
      />

      {!canModifyCatalog && isAdmin && (pendingCount > 0 || blockedCount > 0) && (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Existing products can be edited or deleted after pending transactions
          are synced. New products can still be added while connected.
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
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <ContentSection
        label="Main"
        rightContent={
          !isLoading ? (
            <span className="text-text-tertiary text-sm">
              {mainProducts.length} {mainProducts.length === 1 ? 'item' : 'items'}
            </span>
          ) : undefined
        }
      >
        <div className="md:hidden">{renderMobileProducts(mainProducts)}</div>
        <div className="hidden md:block">
          <DataTable
            collection={mainCollection}
            columns={columns}
            loading={isLoading}
            emptyMessage="No items found"
          />
        </div>
      </ContentSection>

      <ContentSection
        label="Add-ons"
        rightContent={
          !isLoading ? (
            <span className="text-text-tertiary text-sm">
              {addOnProducts.length} {addOnProducts.length === 1 ? 'item' : 'items'}
            </span>
          ) : undefined
        }
      >
        <div className="md:hidden">{renderMobileProducts(addOnProducts)}</div>
        <div className="hidden md:block">
          <DataTable
            collection={addOnCollection}
            columns={columns}
            loading={isLoading}
            emptyMessage="No items found"
          />
        </div>
      </ContentSection>

      <AddItemModal
        key={addItem.open ? 'add-open' : 'add-closed'}
        open={isAdmin && addItem.open}
        onClose={addItem.onClose}
      />

      <EditItemModal
        key={selectedItem?.id ?? 'edit-none'}
        item={selectedItem}
        open={editItem.open}
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
    </div>
  )
}

export default ProductPage
