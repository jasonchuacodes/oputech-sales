'use client'

import { useMemo, useState } from 'react'
import { ChevronRight, Receipt, ShoppingBag } from 'lucide-react'
import { Button, PageHeader, Spinner } from '../../components'
import { DataTable, type DataTableColumn } from '../../components/ui/data-table'
import { DatePicker } from '../../components/ui/date-picker'
import { useTransactions } from '../../services/transaction/transaction.queries'
import {
  PaymentType,
  type Transaction,
  TransactionType,
} from '../../services/transaction/transaction.types'
import { dayjsLocal, formatDate, formatTime } from '../../utils/date'
import { formatCurrency } from '../../utils/number'
import { cn } from '../../utils/cn'
import { DeleteConfirmModal } from './components/DeleteConfirmModal'
import { LogExpenseModal } from './components/LogExpenseModal'
import { TransactionActionsSheet } from './components/TransactionActionsSheet'
import { TransactionActions } from './components/TransactionActions'

const getTransactionTitle = (transaction: Transaction) => {
  if (transaction.type === TransactionType.Expense) {
    return transaction.label || 'Expense'
  }

  const [firstItem, ...remainingItems] = transaction.items
  if (!firstItem) return 'Sale'

  const firstItemLabel = `${firstItem.name}${firstItem.quantity > 1 ? ` ×${firstItem.quantity}` : ''}`
  return remainingItems.length > 0
    ? `${firstItemLabel} +${remainingItems.length} more`
    : firstItemLabel
}

const getStatus = (transaction: Transaction) => {
  if (transaction.syncState === 'blocked') {
    return {
      label: 'Sync blocked',
      className: 'bg-destructive/10 text-destructive',
    }
  }
  if (transaction.syncState === 'deleting') {
    return { label: 'Deleting', className: 'bg-info/10 text-info' }
  }
  if (transaction.syncState === 'pending') {
    return { label: 'Unsynced', className: 'bg-info/10 text-info' }
  }
  if (transaction.processed) {
    return { label: 'Processed', className: 'bg-success/10 text-success' }
  }
  return { label: 'Pending report', className: 'bg-warning/10 text-warning' }
}

const TransactionsPage = () => {
  const [date, setDate] = useState(dayjsLocal().format('YYYY-MM-DD'))
  const [selectedItem, setSelectedItem] = useState<Transaction | null>(null)
  const [actionsOpen, setActionsOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [expenseOpen, setExpenseOpen] = useState(false)

  const { data, isLoading } = useTransactions({
    from: dayjsLocal(date).startOf('day').toISOString(),
    to: dayjsLocal(date).endOf('day').toISOString(),
  })

  const transactions = useMemo(
    () =>
      [...(data ?? [])].sort(
        (left, right) =>
          dayjsLocal(right.occurredAt).valueOf() -
          dayjsLocal(left.occurredAt).valueOf()
      ),
    [data]
  )

  const openActions = (item: Transaction) => {
    setSelectedItem(item)
    setActionsOpen(true)
  }

  const openDelete = () => {
    if (!selectedItem || selectedItem.processed) return
    setActionsOpen(false)
    setDeleteOpen(true)
  }

  const requestDelete = (item: Transaction) => {
    if (item.processed) return
    setSelectedItem(item)
    setActionsOpen(false)
    setDeleteOpen(true)
  }

  const transactionCountLabel = `${transactions.length} ${transactions.length === 1 ? 'transaction' : 'transactions'}`
  const columns: DataTableColumn<Transaction>[] = [
    {
      id: 'occurredAt',
      heading: 'Time',
      cell: (item) => formatTime(item.occurredAt),
    },
    {
      id: 'description',
      heading: 'Description',
      cell: (item) => getTransactionTitle(item),
    },
    {
      id: 'type',
      heading: 'Type',
      cell: (item) => (item.type === TransactionType.Expense ? 'Expense' : 'Sale'),
    },
    {
      id: 'paymentType',
      heading: 'Payment',
      cell: (item) => (item.paymentType === PaymentType.Cash ? 'Cash' : 'Online'),
    },
    {
      id: 'total',
      heading: 'Total',
      align: 'right',
      cell: (item) => (
        <span className={cn('font-semibold', item.type === TransactionType.Expense && 'text-destructive')}>
          {item.type === TransactionType.Expense ? '-' : ''}
          {formatCurrency(item.total)}
        </span>
      ),
    },
    {
      id: 'status',
      heading: 'Status',
      cell: (item) => {
        const status = getStatus(item)
        return (
          <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', status.className)}>
            {status.label}
          </span>
        )
      },
    },
    {
      id: 'actions',
      heading: '',
      align: 'right',
      width: 64,
      cell: (item) => (
        <TransactionActions item={item} onView={openActions} onDelete={requestDelete} />
      ),
    },
  ]

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-5 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Activity"
          description="Review sales and expenses by transaction date."
        />
        <Button
          variant="outline"
          className="w-full gap-2 sm:w-auto"
          onClick={() => setExpenseOpen(true)}
        >
          <Receipt className="size-4" />
          Log Expense
        </Button>
      </div>

      <section
        className="flex flex-col gap-3"
        aria-labelledby="activity-filter"
      >
        <h2
          id="activity-filter"
          className="text-text-secondary text-xs font-semibold tracking-[0.16em] uppercase"
        >
          Filter
        </h2>
        <div className="rounded-card bg-card p-4 shadow-card">
          <DatePicker
            value={dayjsLocal(date).toDate()}
            onChange={(next) =>
              next && setDate(dayjsLocal(next).format('YYYY-MM-DD'))
            }
            disableFuture
            className="w-full md:w-64"
          />
        </div>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="activity-date">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="activity-date" className="text-lg font-semibold">
            {formatDate(date)}
          </h2>
          {!isLoading && (
            <span className="text-text-tertiary shrink-0 text-sm">
              {transactionCountLabel}
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="rounded-card bg-card flex min-h-40 items-center justify-center shadow-card">
            <Spinner />
          </div>
        ) : transactions.length === 0 ? (
          <div className="rounded-card bg-card flex min-h-52 flex-col items-center justify-center gap-3 p-6 text-center shadow-card">
            <span className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-full">
              <Receipt className="size-6" aria-hidden="true" />
            </span>
            <div className="flex flex-col gap-1">
              <p className="font-semibold">No transactions found</p>
              <p className="text-text-secondary text-sm">
                Sales and expenses recorded on this date will appear here.
              </p>
            </div>
          </div>
        ) : (
          <>
          <ul className="rounded-card bg-card overflow-hidden shadow-card md:hidden">
            {transactions.map((transaction) => {
              const isExpense = transaction.type === TransactionType.Expense
              const Icon = isExpense ? Receipt : ShoppingBag
              const status = getStatus(transaction)
              const title = getTransactionTitle(transaction)

              return (
                <li
                  key={transaction.id}
                  className="border-border/60 border-b last:border-b-0"
                >
                  <button
                    type="button"
                    onClick={() => openActions(transaction)}
                    className="hover:bg-surface-hover focus-visible:bg-surface-hover focus-visible:ring-ring/30 grid min-h-28 w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-4 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-inset sm:px-4"
                    aria-label={`Open actions for ${title}`}
                  >
                    <span
                      className={cn(
                        'flex size-11 shrink-0 items-center justify-center rounded-full',
                        isExpense
                          ? 'bg-destructive/10 text-destructive'
                          : 'bg-primary/10 text-primary'
                      )}
                    >
                      <Icon className="size-5" aria-hidden="true" />
                    </span>

                    <span className="flex min-w-0 flex-col gap-1">
                      <span className="truncate font-semibold">{title}</span>
                      <span className="text-text-secondary truncate text-sm">
                        {isExpense ? 'Expense' : 'Sale'} ·{' '}
                        {transaction.paymentType === PaymentType.Cash
                          ? 'Cash'
                          : 'Online'}
                      </span>
                      <span className="text-text-tertiary text-sm">
                        {formatTime(transaction.occurredAt)}
                      </span>
                    </span>

                    <span className="flex items-center gap-1">
                      <span className="flex flex-col items-end gap-2">
                        <span
                          className={cn(
                            'font-semibold whitespace-nowrap',
                            isExpense && 'text-destructive'
                          )}
                        >
                          {isExpense ? '-' : ''}
                          {formatCurrency(transaction.total)}
                        </span>
                        <span
                          className={cn(
                            'rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap',
                            status.className
                          )}
                        >
                          {status.label}
                        </span>
                      </span>
                      <ChevronRight
                        className="text-text-tertiary size-5 shrink-0"
                        aria-hidden="true"
                      />
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          <div className="hidden md:block">
            <DataTable
              collection={DataTable.collection({
                items: transactions,
                itemToValue: (item) => item.id,
                itemToString: (item) => getTransactionTitle(item),
              })}
              columns={columns}
            />
          </div>
          </>
        )}
      </section>

      <TransactionActionsSheet
        item={selectedItem}
        open={actionsOpen}
        onOpenChange={setActionsOpen}
        onDelete={openDelete}
      />

      <DeleteConfirmModal
        item={selectedItem}
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false)
          setSelectedItem(null)
        }}
      />

      <LogExpenseModal
        open={expenseOpen}
        onClose={() => setExpenseOpen(false)}
      />
    </div>
  )
}

export default TransactionsPage
