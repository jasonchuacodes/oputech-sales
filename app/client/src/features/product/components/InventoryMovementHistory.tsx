'use client'

import { useState } from 'react'
import { Button, CustomModal, SheetSelect } from '@/components'
import { DataTable, type DataTableColumn } from '@/components/ui/data-table'
import type { Product } from '@/services/product/product.types'
import { useStockMovements } from '@/services/stock/stock.queries'
import {
  StockMovementReason,
  stockUnitLabels,
  type StockMovement,
} from '@/services/stock/stock.types'
import { formatTime } from '@/utils/date'

interface Props {
  open: boolean
  product: Product
  onClose: () => void
}

const reasonLabels: Record<StockMovementReason, string> = {
  [StockMovementReason.Opening]: 'Opening count',
  [StockMovementReason.Receipt]: 'Receipt',
  [StockMovementReason.Sale]: 'Sale',
  [StockMovementReason.Void]: 'Sale void',
  [StockMovementReason.Correction]: 'Count correction',
}

const quantity = (value: string) =>
  Number(value).toLocaleString(undefined, { maximumFractionDigits: 6 })

export const InventoryMovementHistory = ({ open, product, onClose }: Props) => {
  const [page, setPage] = useState(1)
  const [reason, setReason] = useState('')
  const movements = useStockMovements(
    page,
    product.id,
    (reason || undefined) as StockMovementReason | undefined,
    open
  )
  const items = movements.data?.items ?? []

  const columns: DataTableColumn<StockMovement>[] = [
    {
      id: 'occurredAt',
      heading: 'Occurred',
      cell: (movement) => formatTime(movement.occurredAt, 'MMM D, h:mm A'),
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
        <span
          className={
            Number(movement.delta) < 0 ? 'text-destructive' : 'text-emerald-700'
          }
        >
          {Number(movement.delta) > 0 ? '+' : ''}
          {quantity(movement.delta)} {stockUnitLabels[movement.unit]}
        </span>
      ),
    },
    {
      id: 'balance',
      heading: 'Balance',
      cell: (movement) =>
        `${quantity(movement.balanceBefore)} → ${quantity(movement.balanceAfter)} ${stockUnitLabels[movement.unit]}`,
    },
    {
      id: 'note',
      heading: 'Note',
      cell: (movement) => movement.note || '—',
    },
  ]

  return (
    <CustomModal
      open={open}
      title="Movement history"
      subheader={product.name}
      maxWidth={880}
      hideActions
      onClose={onClose}
    >
      <div className="flex flex-col gap-4">
        <div className="w-full sm:max-w-xs">
          <SheetSelect
            title="Filter by reason"
            value={reason}
            onValueChange={(value) => {
              setReason(value === 'ALL' ? '' : value)
              setPage(1)
            }}
            displayValue={
              reason
                ? reasonLabels[reason as StockMovementReason]
                : 'All movement types'
            }
            options={[
              { value: 'ALL', label: 'All movement types' },
              ...Object.values(StockMovementReason).map((value) => ({
                value,
                label: reasonLabels[value],
              })),
            ]}
          />
        </div>

        {movements.isError && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <p>{movements.error.message}</p>
            <Button
              size="sm"
              variant="outline"
              className="mt-2"
              onClick={() => void movements.refetch()}
            >
              Retry
            </Button>
          </div>
        )}

        <div className="md:hidden">
          <MobileMovementList items={items} loading={movements.isLoading} />
        </div>
        <div className="hidden md:block">
          <DataTable
            collection={DataTable.collection({
              items,
              itemToValue: (movement) => movement.id,
              itemToString: (movement) =>
                `${movement.reason} ${movement.note ?? ''}`,
            })}
            columns={columns}
            loading={movements.isLoading}
            emptyMessage="No stock movements found"
            compact
          />
        </div>

        <Pagination
          page={movements.data?.page ?? 1}
          hasPrevious={movements.data?.hasPreviousPage ?? false}
          hasNext={movements.data?.hasNextPage ?? false}
          loading={movements.isFetching}
          onPage={setPage}
        />
      </div>
    </CustomModal>
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
    return (
      <div className="rounded-card bg-card shadow-card h-28 animate-pulse" />
    )
  }
  if (items.length === 0) {
    return (
      <div className="rounded-card bg-card text-text-secondary shadow-card p-4 text-center text-sm">
        No stock movements found
      </div>
    )
  }
  return (
    <ul className="rounded-card bg-card shadow-card overflow-hidden">
      {items.map((movement) => (
        <li
          key={movement.id}
          className="border-border/60 flex min-h-20 items-start gap-3 border-b p-3 last:border-b-0"
        >
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-text-heading font-medium">
              {reasonLabels[movement.reason]}
            </span>
            <span className="text-text-tertiary text-sm">
              {formatTime(movement.occurredAt, 'MMM D, h:mm A')}
            </span>
            {movement.note && (
              <span className="text-text-secondary truncate text-sm">
                {movement.note}
              </span>
            )}
          </span>
          <span className="flex shrink-0 flex-col items-end gap-1">
            <span
              className={
                Number(movement.delta) < 0
                  ? 'text-destructive font-semibold'
                  : 'font-semibold text-emerald-700'
              }
            >
              {Number(movement.delta) > 0 ? '+' : ''}
              {quantity(movement.delta)} {stockUnitLabels[movement.unit]}
            </span>
            <span className="text-text-tertiary text-xs">
              {quantity(movement.balanceBefore)} →{' '}
              {quantity(movement.balanceAfter)}
            </span>
          </span>
        </li>
      ))}
    </ul>
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
    <div className="flex items-center justify-end gap-2">
      <Button
        size="sm"
        variant="outline"
        disabled={!hasPrevious || loading}
        onClick={() => onPage(page - 1)}
      >
        Previous
      </Button>
      <span className="text-text-tertiary text-sm">Page {page}</span>
      <Button
        size="sm"
        variant="outline"
        disabled={!hasNext || loading}
        onClick={() => onPage(page + 1)}
      >
        Next
      </Button>
    </div>
  )
}
