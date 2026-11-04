'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '../../components'
import { PageHeader } from '../../components/ui/page-header'
import { DataTable, DataTableColumn } from '../../components/ui/data-table'
import { cn } from '../../utils/cn'
import {
  useCreateReport,
  useReports,
} from '../../services/report/report.queries'
import { useTransactions } from '../../services/transaction/transaction.queries'
import {
  PaymentType,
  TransactionType,
} from '../../services/transaction/transaction.types'
import { ReportDisplay } from './components/ReportDisplay'
import { DeleteConfirmModal } from './components/DeleteConfirmModal'
import { dayjsLocal } from '../../utils/date'
import { formatCurrency } from '../../utils/number'
import { Report } from '../../services/report/report.types'
import { reportDetailPath } from '../../routes/paths'
import { useAuthContext } from '../../context/auth/useAuthContext'
import { UserRole } from '../../types'
import { DatePicker } from '../../components/ui/date-picker'
import { useSyncContext } from '../../context/sync/useSyncContext'

const ReportPage = () => {
  const router = useRouter()
  const { auth } = useAuthContext()
  const isAdmin = auth?.role === UserRole.ADMIN
  const { canUseOnlineFeatures } = useSyncContext()
  const [reportDate, setReportDate] = useState(
    dayjsLocal().format('YYYY-MM-DD')
  )
  const { data: allReports, isLoading: reportsLoading } = useReports()
  const { data: transactions, isLoading: txLoading } = useTransactions({
    from: dayjsLocal(reportDate).startOf('day').toISOString(),
    to: dayjsLocal(reportDate).endOf('day').toISOString(),
    processed: false,
  })
  const { mutate: generate, isPending } = useCreateReport()
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const selectedDateReports = useMemo(
    () =>
      (allReports ?? []).filter((r) =>
        dayjsLocal(r.toDate).isSame(dayjsLocal(reportDate), 'day')
      ),
    [allReports, reportDate]
  )

  const openDelete = (id: string) => {
    const report = selectedDateReports.find((r) => r.id === id)
    if (!report) return
    setSelectedReport(report)
    setDeleteOpen(true)
  }

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
      if (tx.type === TransactionType.Expense) {
        totalExpenses += tx.total
      } else if (tx.paymentType === PaymentType.Cash) {
        totalCash += tx.total
      } else {
        totalOnline += tx.total
      }

      for (const item of tx.items) {
        const existing = productMap.get(item.productId)
        if (existing) {
          existing.quantitySold += item.quantity
        } else {
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
      products: Array.from(productMap.entries()).map(([productId, v]) => ({
        productId,
        ...v,
      })),
      totalCash,
      totalOnline,
      totalIncome: totalCash + totalOnline,
      totalExpenses,
      totalPrintCount: Array.from(productMap.values()).reduce(
        (sum, p) => sum + p.printCount * p.quantitySold,
        0
      ),
    }
  }, [transactions])

  const isLoading = isAdmin ? reportsLoading : reportsLoading || txLoading
  const hasTransactions = (transactions?.length ?? 0) > 0
  const hasReports = selectedDateReports.length > 0

  const handleGenerate = () => {
    generate({
      fromDate: dayjsLocal(reportDate).startOf('day').toISOString(),
      toDate: dayjsLocal(reportDate).isSame(dayjsLocal(), 'day')
        ? dayjsLocal().toISOString()
        : dayjsLocal(reportDate).endOf('day').toISOString(),
    })
  }

  const reportColumns: DataTableColumn<Report>[] = [
    {
      id: 'date',
      heading: 'Date',
      orderable: true,
      cell: (r) => dayjsLocal(r.toDate).format('MMM D, YYYY'),
    },
    {
      id: 'totalCash',
      heading: 'Cash',
      cell: (r) => formatCurrency(r.totalCash),
    },
    {
      id: 'totalGCash',
      heading: 'Online Payments',
      cell: (r) => formatCurrency(r.totalOnline),
    },
    {
      id: 'totalIncome',
      heading: 'Total Income',
      cell: (r) => formatCurrency(r.totalIncome),
    },
    {
      id: 'totalExpenses',
      heading: 'Expenses',
      cell: (r) => formatCurrency(r.totalExpenses),
    },
    {
      id: 'status',
      heading: 'Status',
      cell: (r) => (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium',
            r.isRemitted
              ? 'bg-success/10 text-green-800'
              : 'bg-warning/10 text-yellow-800'
          )}
        >
          <span
            className={cn(
              'h-2 w-2 shrink-0 rounded-full',
              r.isRemitted ? 'bg-green-500' : 'bg-yellow-500'
            )}
          />
          {r.isRemitted ? 'Remitted' : 'Pending'}
        </span>
      ),
    },
  ]

  const reportsCollection = DataTable.collection({
    items: allReports ?? [],
    itemToValue: (r) => r.id,
    itemToString: (r) => dayjsLocal(r.toDate).format('MMM D, YYYY'),
  })

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-5 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Reports"
          description={
            isAdmin ? 'All generated reports' : 'Sales report by transaction date'
          }
        />
        {!isAdmin && (
          <Button
            className="w-full sm:w-auto"
            onClick={handleGenerate}
            disabled={
              isPending || !hasTransactions || !canUseOnlineFeatures
            }
            title={
              canUseOnlineFeatures
                ? undefined
                : 'Connect and sync pending transactions first'
            }
          >
            {isPending ? 'Generating…' : 'Generate Report'}
          </Button>
        )}
      </div>

      {!isAdmin && (
        <DatePicker
          label="Report Date"
          value={dayjsLocal(reportDate).toDate()}
          onChange={(next) =>
            next && setReportDate(dayjsLocal(next).format('YYYY-MM-DD'))
          }
          disableFuture
          className="w-full md:w-56"
        />
      )}

      {!canUseOnlineFeatures && (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Reports are available after this device is online and all pending transactions are synced.
        </p>
      )}

      {isAdmin ? (
        <DataTable
          collection={reportsCollection}
          columns={reportColumns}
          loading={reportsLoading}
          emptyMessage="No reports generated yet."
          onRowClick={(r) => router.push(reportDetailPath(r.id))}
        />
      ) : isLoading ? (
        <div className="flex flex-col gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="h-48 animate-pulse rounded-lg border bg-slate-100"
            />
          ))}
        </div>
      ) : !hasTransactions && !hasReports ? (
        <div className="flex flex-col items-center gap-2 py-20 text-center">
          <p className="text-lg font-medium text-slate-700">
            No activity today
          </p>
          <p className="text-sm text-slate-400">
            Transactions will appear here once sales are recorded.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {previewReport && (
            <ReportDisplay report={previewReport as Report} isPreview />
          )}
          {selectedDateReports.map((report, i) => (
            <ReportDisplay key={i} report={report} onDelete={openDelete} />
          ))}
        </div>
      )}

      <DeleteConfirmModal
        item={selectedReport}
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false)
          setSelectedReport(null)
        }}
      />
    </div>
  )
}

export default ReportPage
