'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, Plus, Receipt, ShoppingBag } from 'lucide-react'
import { Button, Spinner } from '../../components'
import { DataTable, type DataTableColumn } from '../../components/ui/data-table'
import { DatePicker } from '../../components/ui/date-picker'
import { useTransactions } from '../../services/transaction/transaction.queries'
import {
  PaymentType,
  type Transaction,
  TransactionType,
} from '../../services/transaction/transaction.types'
import { dayjsLocal, formatTime } from '../../utils/date'
import { formatCurrency } from '../../utils/number'
import { cn } from '../../utils/cn'
import { DeleteConfirmModal } from './components/DeleteConfirmModal'
import { LogExpenseModal } from './components/LogExpenseModal'
import { TransactionActionsSheet } from './components/TransactionActionsSheet'
import { TransactionActions } from './components/TransactionActions'
import { useDisclosure } from '../../hooks/useDisclosure'
import { useCreateReport } from '../../services/report/report.queries'
import { reportDetailPath } from '../../routes/paths'
import { useSyncContext } from '../../context/sync/useSyncContext'
import {
  getTransactionStatus,
  getTransactionTitle,
} from './transaction-display'

const TransactionsPage = () => {
  const router = useRouter()
  const [date, setDate] = useState(dayjsLocal().format('YYYY-MM-DD'))
  const [selectedItem, setSelectedItem] = useState<Transaction | null>(null)
  const transactionActions = useDisclosure()
  const deleteTransaction = useDisclosure()
  const logExpense = useDisclosure()
  const createReport = useCreateReport()
  const { canGenerateReport } = useSyncContext()

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
  const pendingReportTransactions = transactions.filter(
    (transaction) => !transaction.processed
  )

  const handleGenerateReport = () => {
    createReport.mutate(
      {
        fromDate: dayjsLocal(date).startOf('day').toISOString(),
        toDate: dayjsLocal(date).isSame(dayjsLocal(), 'day')
          ? dayjsLocal().toISOString()
          : dayjsLocal(date).endOf('day').toISOString(),
      },
      {
        onSuccess: (report) => router.push(reportDetailPath(report.id)),
      }
    )
  }

  const openActions = (item: Transaction) => {
    setSelectedItem(item)
    transactionActions.onOpen()
  }

  const openDelete = () => {
    if (!selectedItem || selectedItem.processed) return
    transactionActions.onClose()
    deleteTransaction.onOpen()
  }

  const requestDelete = (item: Transaction) => {
    if (item.processed) return
    setSelectedItem(item)
    transactionActions.onClose()
    deleteTransaction.onOpen()
  }

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
      cell: (item) =>
        item.type === TransactionType.Expense ? 'Expense' : 'Sale',
    },
    {
      id: 'paymentType',
      heading: 'Payment',
      cell: (item) =>
        item.paymentType === PaymentType.Cash ? 'Cash' : 'Online',
    },
    {
      id: 'total',
      heading: 'Total',
      align: 'right',
      cell: (item) => (
        <span
          className={cn(
            'font-semibold',
            item.type === TransactionType.Expense && 'text-destructive'
          )}
        >
          {item.type === TransactionType.Expense ? '-' : ''}
          {formatCurrency(item.total)}
        </span>
      ),
    },
    {
      id: 'status',
      heading: 'Status',
      cell: (item) => {
        const status = getTransactionStatus(item)
        return (
          <span
            className={cn(
              'rounded-full px-2.5 py-1 text-xs font-medium',
              status.className
            )}
          >
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
        <TransactionActions
          item={item}
          onView={openActions}
          onDelete={requestDelete}
        />
      ),
    },
  ]

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-5 py-5 md:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h1 className="text-page-title font-semibold">Activity</h1>
          <p className="text-text-secondary text-sm text-balance">
            Review sales and expenses by transaction date.
          </p>
        </div>
        <Button
          variant="outline"
          className="shrink-0 gap-1.5 px-3"
          onClick={logExpense.onOpen}
        >
          <Plus className="size-4" />
          Log expense
        </Button>
      </div>

      <section
        className="flex flex-col gap-0"
        aria-labelledby="activity-transactions"
      >
        <div className="flex min-h-10 items-center justify-between gap-3">
          <h2
            id="activity-transactions"
            className="text-card-title font-medium"
          >
            Transactions
          </h2>
          <div className="flex min-w-0 items-center justify-end gap-1.5">
            <span className="text-text-tertiary shrink-0 text-xs">Period</span>
            <DatePicker
              value={dayjsLocal(date).toDate()}
              onChange={(next) =>
                next && setDate(dayjsLocal(next).format('YYYY-MM-DD'))
              }
              disableFuture
              triggerIcon="chevron"
              className="text-text-secondary h-10 w-auto min-w-0 border-0 bg-transparent px-1 text-sm font-medium shadow-none [&_svg]:size-4"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-card bg-card shadow-card flex min-h-40 items-center justify-center">
            <Spinner />
          </div>
        ) : transactions.length === 0 ? (
          <div className="rounded-card bg-card shadow-card flex min-h-40 flex-col items-center justify-center gap-2 p-4 text-center">
            <span className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-full">
              <Receipt className="size-6" aria-hidden="true" />
            </span>
            <div className="flex flex-col gap-1">
              <p className="text-text-heading font-medium">No transactions found</p>
              <p className="text-text-secondary text-sm">
                Sales and expenses recorded on this date will appear here.
              </p>
            </div>
          </div>
        ) : (
          <>
            <ul className="rounded-card bg-card shadow-card overflow-hidden md:hidden">
              {transactions.map((transaction) => {
                const isExpense = transaction.type === TransactionType.Expense
                const Icon = isExpense ? Receipt : ShoppingBag
                const status = getTransactionStatus(transaction)
                const title = getTransactionTitle(transaction)

                return (
                  <li
                    key={transaction.id}
                    className="border-border/60 border-b last:border-b-0"
                  >
                    <button
                      type="button"
                      onClick={() => openActions(transaction)}
                      className="hover:bg-surface-hover focus-visible:bg-surface-hover focus-visible:ring-ring/30 grid min-h-24 w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-inset sm:px-4"
                      aria-label={`Open actions for ${title}`}
                    >
                      <span
                        className={cn(
                          'flex size-10 shrink-0 items-center justify-center rounded-full',
                          isExpense
                            ? 'bg-destructive/10 text-destructive'
                            : 'bg-primary/10 text-primary'
                        )}
                      >
                        <Icon className="size-5" aria-hidden="true" />
                      </span>

                      <span className="flex min-w-0 flex-col gap-1">
                        <span className="text-text-heading truncate font-medium">{title}</span>
                        <span className="text-text-tertiary truncate text-sm">
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

        {!isLoading && pendingReportTransactions.length > 0 && (
          <div className="flex flex-col items-end gap-2 pt-2">
            {!canGenerateReport && (
              <p className="w-full rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                Connect and finish syncing pending activity before generating
                this report.
              </p>
            )}
            <Button
              className="h-10 px-2.5"
              onClick={handleGenerateReport}
              disabled={createReport.isPending || !canGenerateReport}
              title={
                canGenerateReport
                  ? undefined
                  : 'Connect and sync pending transactions first'
              }
            >
              {createReport.isPending ? 'Generating…' : 'Generate report'}
            </Button>
          </div>
        )}
      </section>

      <TransactionActionsSheet
        item={selectedItem}
        open={transactionActions.open}
        onOpenChange={transactionActions.setOpen}
        onDelete={openDelete}
      />

      <DeleteConfirmModal
        item={selectedItem}
        open={deleteTransaction.open}
        onClose={() => {
          deleteTransaction.onClose()
          setSelectedItem(null)
        }}
      />

      <LogExpenseModal open={logExpense.open} onClose={logExpense.onClose} />
    </div>
  )
}

export default TransactionsPage
