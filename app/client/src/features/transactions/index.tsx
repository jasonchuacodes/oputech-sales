'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronRight,
  FileText,
  Plus,
  Receipt,
  RefreshCw,
  ShoppingBag,
} from 'lucide-react'
import { Button, ContentSection, PageHeader, Spinner } from '../../components'
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
import { getTransactionSummary } from './transaction-summary'
import { useTenantContext } from '../../context/tenant/useTenantContext'
import { TenantType } from '../../services/tenant/tenant.types'

const TransactionsPage = () => {
  const router = useRouter()
  const [date, setDate] = useState(dayjsLocal().format('YYYY-MM-DD'))
  const [selectedItem, setSelectedItem] = useState<Transaction | null>(null)
  const transactionActions = useDisclosure()
  const deleteTransaction = useDisclosure()
  const logExpense = useDisclosure()
  const createReport = useCreateReport()
  const sync = useSyncContext()
  const { currentTenant } = useTenantContext()
  const showPrintCount = currentTenant?.type === TenantType.PHOTO

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
  const showGenerateReport = !isLoading && pendingReportTransactions.length > 0
  const pendingReportSummary = getTransactionSummary(pendingReportTransactions)
  const formattedPendingReportNetTotal =
    pendingReportSummary.total < 0
      ? `-${formatCurrency(Math.abs(pendingReportSummary.total))}`
      : formatCurrency(pendingReportSummary.total)
  const syncBusy = sync.phase === 'checking' || sync.phase === 'syncing'
  const changeLabel = `${sync.pendingCount} ${sync.pendingCount === 1 ? 'change' : 'changes'}`
  const reportSyncMessage = !sync.statsReady
    ? sync.lastError
      ? 'Saved changes could not be checked on this device.'
      : 'Checking saved changes…'
    : sync.authRequired
      ? 'Sign in again to sync changes and generate this report.'
      : sync.phase === 'checking'
        ? 'Checking connection…'
        : sync.phase === 'syncing'
          ? 'Syncing changes before generating this report.'
          : sync.blockedCount > 0
            ? `${sync.blockedCount} ${sync.blockedCount === 1 ? 'change needs' : 'changes need'} attention before generating this report.`
            : sync.reachability === 'unreachable'
              ? sync.pendingCount > 0
                ? `Connect to the server and sync ${changeLabel} before generating this report.`
                : 'Connect to the server before generating this report.'
              : sync.pendingCount > 0
                ? sync.phase === 'backoff'
                  ? `${changeLabel} ${sync.pendingCount === 1 ? 'is' : 'are'} waiting to sync before generating this report.`
                  : `Sync ${changeLabel} before generating this report.`
                : 'Finish refreshing activity before generating this report.'
  const canRequestSync = sync.statsReady && !sync.authRequired && !syncBusy
  const syncActionLabel =
    sync.blockedCount > 0
      ? 'Retry blocked changes'
      : sync.reachability === 'unreachable'
        ? 'Check connection and sync'
        : 'Sync pending changes'

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

  const reportSummary = showGenerateReport ? (
    <section
      className="rounded-card bg-card shadow-card overflow-hidden"
      aria-labelledby="pending-report-summary"
    >
      <header className="border-border/60 flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2
            id="pending-report-summary"
            className="text-text-heading font-semibold"
          >
            Pending report summary
          </h2>
          <p className="text-text-secondary text-sm">
            {pendingReportTransactions.length}{' '}
            {pendingReportTransactions.length === 1
              ? 'transaction is'
              : 'transactions are'}{' '}
            ready to include.
          </p>
        </div>
        <Button
          size="sm"
          className="w-full shrink-0 sm:w-auto"
          onClick={handleGenerateReport}
          disabled={createReport.isPending || !sync.canGenerateReport}
          title={sync.canGenerateReport ? undefined : reportSyncMessage}
        >
          <FileText aria-hidden="true" />
          {createReport.isPending ? 'Generating…' : 'Generate report'}
        </Button>
      </header>

      <div className="flex flex-col gap-4 p-4">
        <dl
          className={cn(
            'grid grid-cols-2 gap-2',
            showPrintCount
              ? 'sm:grid-cols-3 lg:grid-cols-5'
              : 'sm:grid-cols-4'
          )}
        >
          <div className="bg-background rounded-md p-3">
            <dt className="text-text-secondary text-xs font-medium">
              Net total
            </dt>
            <dd className="text-text-heading mt-1 font-semibold tabular-nums">
              {formattedPendingReportNetTotal}
            </dd>
          </div>
          <div className="bg-background rounded-md p-3">
            <dt className="text-text-secondary text-xs font-medium">Cash</dt>
            <dd className="text-text-heading mt-1 font-semibold tabular-nums">
              {formatCurrency(pendingReportSummary.totalCash)}
            </dd>
          </div>
          <div className="bg-background rounded-md p-3">
            <dt className="text-text-secondary text-xs font-medium">Online</dt>
            <dd className="text-text-heading mt-1 font-semibold tabular-nums">
              {formatCurrency(pendingReportSummary.totalOnline)}
            </dd>
          </div>
          <div className="bg-background rounded-md p-3">
            <dt className="text-text-secondary text-xs font-medium">
              Expenses
            </dt>
            <dd className="text-text-heading mt-1 font-semibold tabular-nums">
              {formatCurrency(pendingReportSummary.totalExpenses)}
            </dd>
          </div>
          {showPrintCount && (
            <div className="bg-background rounded-md p-3">
              <dt className="text-text-secondary text-xs font-medium">
                Total prints
              </dt>
              <dd className="text-text-heading mt-1 font-semibold tabular-nums">
                {pendingReportSummary.totalPrintCount.toLocaleString()}
              </dd>
            </div>
          )}
        </dl>

        {pendingReportSummary.products.length > 0 && (
          <section
            className="border-border/60 flex flex-col gap-2 border-t pt-4"
            aria-labelledby="pending-products-sold"
          >
            <div className="flex items-center justify-between gap-3">
              <h3
                id="pending-products-sold"
                className="text-text-heading text-sm font-semibold"
              >
                Products sold
              </h3>
              <span className="text-text-tertiary text-xs">
                {pendingReportSummary.products.length}{' '}
                {pendingReportSummary.products.length === 1
                  ? 'product'
                  : 'products'}
              </span>
            </div>
            <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {pendingReportSummary.products.map((product) => (
                <div
                  key={product.productId}
                  className="bg-background flex min-w-0 items-center justify-between gap-3 rounded-md px-3 py-2.5"
                >
                  <dt
                    className="text-text-secondary min-w-0 truncate text-sm"
                    title={product.name}
                  >
                    {product.name}
                  </dt>
                  <dd className="text-text-heading shrink-0 font-semibold tabular-nums">
                    {product.quantity.toLocaleString()}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}
      </div>
    </section>
  ) : null

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-5 py-5 md:p-6">
      <PageHeader
        title="Activity"
        description="Review sales and expenses by transaction date."
        action={
          <Button
            variant="outline"
            className="shrink-0 gap-1.5 px-3"
            onClick={logExpense.onOpen}
          >
            <Plus className="size-4" />
            Log expense
          </Button>
        }
      />

      <ContentSection
        label="Transactions"
        rightContent={
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
        }
      >
        {showGenerateReport && !sync.canGenerateReport && (
          <div className="border-warning/25 bg-warning/10 text-text-secondary mb-2 flex min-h-14 w-full items-center gap-2 rounded-md border py-1.5 pr-1.5 pl-3 text-sm">
            <p className="min-w-0 flex-1" role="status" aria-live="polite">
              {reportSyncMessage}
            </p>
            {(syncBusy || canRequestSync) && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-status-warning hover:bg-warning/10"
                disabled={syncBusy}
                aria-label={syncBusy ? 'Syncing changes' : syncActionLabel}
                title={syncBusy ? 'Syncing changes' : syncActionLabel}
                onClick={() =>
                  void (sync.blockedCount > 0
                    ? sync.retryBlocked()
                    : sync.syncNow())
                }
              >
                <RefreshCw
                  className={cn(
                    syncBusy && 'animate-spin motion-reduce:animate-none'
                  )}
                  aria-hidden="true"
                />
              </Button>
            )}
          </div>
        )}

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
              <p className="text-text-heading font-medium">
                No transactions found
              </p>
              <p className="text-text-secondary text-sm">
                Sales and expenses recorded on this date will appear here.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="rounded-card bg-card shadow-card overflow-hidden md:hidden">
              <ul>
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
                          <span className="text-text-heading truncate font-medium">
                            {title}
                          </span>
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
            </div>
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
      </ContentSection>

      {reportSummary}

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
