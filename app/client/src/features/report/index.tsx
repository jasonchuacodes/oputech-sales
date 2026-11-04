'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '../../components'
import { PageHeader } from '../../components/ui/page-header'
import { DatePicker } from '../../components/ui/date-picker'
import { SheetSelect } from '../../components/ui/sheet-select'
import {
  useCreateReport,
  useRemit,
  useReportsPage,
} from '../../services/report/report.queries'
import { useTransactions } from '../../services/transaction/transaction.queries'
import {
  PaymentType,
  TransactionType,
} from '../../services/transaction/transaction.types'
import type {
  Report,
  ReportDeleteTarget,
  ReportListItem,
  ReportSortOrder,
} from '../../services/report/report.types'
import { reportDetailPath } from '../../routes/paths'
import { useAuthContext } from '../../context/auth/useAuthContext'
import { UserRole } from '../../types'
import { useSyncContext } from '../../context/sync/useSyncContext'
import { dayjsLocal } from '../../utils/date'
import { ReportDisplay } from './components/ReportDisplay'
import { DeleteConfirmModal } from './components/DeleteConfirmModal'
import { ReportFilters } from './components/ReportFilters'
import { ReportList } from './components/ReportList'
import { ReportSummary } from './components/ReportSummary'
import {
  type ReportCalendarRange,
  type ReportFilterPreset,
  getReportPresetRange,
  toReportDateRangeInput,
} from './report-list-state'

const PAGE_SIZE = 10

const ReportPage = () => {
  const router = useRouter()
  const { auth } = useAuthContext()
  const isAdmin = auth?.role === UserRole.ADMIN
  const { canUseOnlineFeatures } = useSyncContext()
  const [reportDate, setReportDate] = useState(dayjsLocal().format('YYYY-MM-DD'))
  const [preset, setPreset] = useState<ReportFilterPreset>('this_month')
  const [range, setRange] = useState<ReportCalendarRange>(() =>
    getReportPresetRange('this_month')
  )
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState<ReportSortOrder>('DATE_DESC')
  const [selectedReport, setSelectedReport] = useState<ReportDeleteTarget | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const queryParams = useMemo(
    () => ({
      filter: { dateRange: toReportDateRangeInput(range) },
      pagination: { page, pageSize: PAGE_SIZE },
      sort,
    }),
    [page, range, sort]
  )
  const reportsQuery = useReportsPage(queryParams)

  const { data: transactions, isLoading: txLoading } = useTransactions({
    from: dayjsLocal(reportDate).startOf('day').toISOString(),
    to: dayjsLocal(reportDate).endOf('day').toISOString(),
    processed: false,
  })
  const createReport = useCreateReport()
  const remitReport = useRemit()

  const previewReport = useMemo(() => {
    if (!transactions?.length) return null

    const productMap = new Map<
      string,
      {
        name: string
        pricePerUnit: number
        printCount: number
        quantitySold: number
      }
    >()
    let totalCash = 0
    let totalOnline = 0
    let totalExpenses = 0

    for (const tx of transactions) {
      if (tx.type === TransactionType.Expense) totalExpenses += tx.total
      else if (tx.paymentType === PaymentType.Cash) totalCash += tx.total
      else totalOnline += tx.total

      for (const item of tx.items) {
        const existing = productMap.get(item.productId)
        if (existing) existing.quantitySold += item.quantity
        else {
          productMap.set(item.productId, {
            name: item.name,
            pricePerUnit: item.price,
            printCount: item.printCount,
            quantitySold: item.quantity,
          })
        }
      }
    }

    return {
      products: Array.from(productMap.entries()).map(([productId, value]) => ({
        productId,
        total: value.pricePerUnit * value.quantitySold,
        ...value,
      })),
      totalCash,
      totalOnline,
      totalIncome: totalCash + totalOnline,
      totalExpenses,
      totalPrintCount: Array.from(productMap.values()).reduce(
        (sum, product) => sum + product.printCount * product.quantitySold,
        0
      ),
    }
  }, [transactions])

  const applyFilter = (
    nextPreset: ReportFilterPreset,
    customRange?: ReportCalendarRange
  ) => {
    setPreset(nextPreset)
    setRange(
      nextPreset === 'custom'
        ? customRange ?? range
        : getReportPresetRange(nextPreset)
    )
    setPage(1)
  }

  const handleGenerate = () => {
    createReport.mutate(
      {
        fromDate: dayjsLocal(reportDate).startOf('day').toISOString(),
        toDate: dayjsLocal(reportDate).isSame(dayjsLocal(), 'day')
          ? dayjsLocal().toISOString()
          : dayjsLocal(reportDate).endOf('day').toISOString(),
      },
      { onSuccess: () => setPage(1) }
    )
  }

  const handleRemit = (item: ReportListItem) => {
    remitReport.mutate({ id: item.id, isRemitted: !item.isRemitted })
  }

  const handleDelete = (item: ReportDeleteTarget) => {
    setSelectedReport(item)
    setDeleteOpen(true)
  }

  const hasTransactions = (transactions?.length ?? 0) > 0

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-5 md:p-6">
      <PageHeader
        title="Reports"
        description="Review generated reports, totals, and remittance status."
      />

      {!isAdmin && (
        <section className="flex flex-col gap-3" aria-labelledby="generate-report">
          <h2
            id="generate-report"
            className="text-text-secondary text-xs font-semibold tracking-[0.16em] uppercase"
          >
            Generate daily report
          </h2>
          <div className="rounded-card bg-card flex flex-col gap-3 p-4 shadow-card sm:flex-row sm:items-end">
            <DatePicker
              label="Report date"
              value={dayjsLocal(reportDate).toDate()}
              onChange={(next) =>
                next && setReportDate(dayjsLocal(next).format('YYYY-MM-DD'))
              }
              disableFuture
              className="w-full sm:w-64"
            />
            <Button
              className="w-full sm:w-auto"
              onClick={handleGenerate}
              disabled={
                createReport.isPending || !hasTransactions || !canUseOnlineFeatures
              }
              title={
                canUseOnlineFeatures
                  ? undefined
                  : 'Connect and sync pending transactions first'
              }
            >
              {createReport.isPending ? 'Generating…' : 'Generate report'}
            </Button>
          </div>

          {txLoading ? (
            <div className="rounded-card bg-card h-32 animate-pulse shadow-card" />
          ) : previewReport ? (
            <ReportDisplay report={previewReport as Report} isPreview />
          ) : (
            <p className="text-text-secondary rounded-card bg-card p-4 text-sm shadow-card">
              No unprocessed activity is available for this date.
            </p>
          )}
        </section>
      )}

      {!canUseOnlineFeatures && (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Reports are available after this device is online and all pending transactions are synced.
        </p>
      )}

      {reportsQuery.data && reportsQuery.data.totalCount > 0 && (
        <ReportSummary totals={reportsQuery.data.totals} />
      )}

      <div className="flex items-center gap-3">
        <ReportFilters
          preset={preset}
          range={range}
          onApply={applyFilter}
        />
        <SheetSelect
          value={sort}
          onValueChange={(value) => {
            setSort(value as ReportSortOrder)
            setPage(1)
          }}
          options={[
            { value: 'DATE_DESC', label: 'Newest first' },
            { value: 'DATE_ASC', label: 'Oldest first' },
          ]}
          title="Sort reports"
          className="min-w-0 flex-1 sm:w-48 sm:flex-none"
        />
      </div>

      <ReportList
        data={reportsQuery.data}
        loading={reportsQuery.isLoading}
        fetching={reportsQuery.isFetching}
        error={reportsQuery.isError}
        unavailable={!canUseOnlineFeatures && !reportsQuery.data}
        isAdmin={isAdmin}
        actionsDisabled={!canUseOnlineFeatures || remitReport.isPending}
        onPageChange={setPage}
        onRetry={() => void reportsQuery.refetch()}
        onView={(item) => router.push(reportDetailPath(item.id))}
        onRemit={handleRemit}
        onDelete={handleDelete}
      />

      <DeleteConfirmModal
        item={selectedReport}
        open={deleteOpen}
        onDeleted={() => {
          if ((reportsQuery.data?.items.length ?? 0) === 1 && page > 1) {
            setPage(page - 1)
          }
        }}
        onClose={() => {
          setDeleteOpen(false)
          setSelectedReport(null)
        }}
      />
    </div>
  )
}

export default ReportPage
