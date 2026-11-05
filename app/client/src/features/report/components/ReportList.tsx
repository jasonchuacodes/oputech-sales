'use client'

import { useState } from 'react'
import { ChevronRight, FileText } from 'lucide-react'
import { Button, Spinner } from '../../../components'
import { DataTable, type DataTableColumn } from '../../../components/ui/data-table'
import type { ReportListItem, ReportsPage } from '../../../services/report/report.types'
import { cn } from '../../../utils/cn'
import { formatDate, formatRange, dayjsLocal } from '../../../utils/date'
import { formatCurrency } from '../../../utils/number'
import { getReportPageCount } from '../report-list-state'
import { ReportActions } from './ReportActions'

interface Props {
  data?: ReportsPage
  loading: boolean
  fetching: boolean
  error: boolean
  unavailable: boolean
  isAdmin: boolean
  actionsDisabled: boolean
  onPageChange: (page: number) => void
  onRetry: () => void
  onView: (item: ReportListItem) => void
  onRemit: (item: ReportListItem) => void
  onDelete: (item: ReportListItem) => void
}

const Status = ({ remitted }: { remitted: boolean }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
      remitted ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
    )}
  >
    <span className={cn('size-2 rounded-full', remitted ? 'bg-success' : 'bg-warning')} />
    {remitted ? 'Remitted' : 'Pending'}
  </span>
)

export const ReportList = ({
  data,
  loading,
  fetching,
  error,
  unavailable,
  isAdmin,
  actionsDisabled,
  onPageChange,
  onRetry,
  onView,
  onRemit,
  onDelete,
}: Props) => {
  const [mobileActionId, setMobileActionId] = useState<string>()
  const items = data?.items ?? []
  const totalCount = data?.totalCount ?? 0
  const page = data?.page ?? 1
  const pageSize = data?.pageSize ?? 10
  const pageCount = getReportPageCount(totalCount, pageSize)
  const firstItem = totalCount === 0 ? 0 : (page - 1) * pageSize + 1
  const lastItem = Math.min(page * pageSize, totalCount)

  const closeAndRemit = (item: ReportListItem) => {
    setMobileActionId(undefined)
    onRemit(item)
  }

  const closeAndView = (item: ReportListItem) => {
    setMobileActionId(undefined)
    onView(item)
  }

  const closeAndDelete = (item: ReportListItem) => {
    setMobileActionId(undefined)
    onDelete(item)
  }

  const columns: DataTableColumn<ReportListItem>[] = [
    {
      id: 'toDate',
      heading: 'Date',
      cell: (item) => formatDate(item.toDate, 'MMM D, YYYY'),
    },
    {
      id: 'totalCash',
      heading: 'Cash',
      align: 'right',
      cell: (item) => formatCurrency(item.totalCash),
    },
    {
      id: 'totalOnline',
      heading: 'Online',
      align: 'right',
      cell: (item) => formatCurrency(item.totalOnline),
    },
    {
      id: 'totalExpenses',
      heading: 'Expenses',
      align: 'right',
      cell: (item) => formatCurrency(item.totalExpenses),
    },
    {
      id: 'netIncome',
      heading: 'Net Income',
      align: 'right',
      cell: (item) => <span className="font-semibold">{formatCurrency(item.netIncome)}</span>,
    },
    {
      id: 'status',
      heading: 'Status',
      cell: (item) => <Status remitted={item.isRemitted} />,
    },
    {
      id: 'actions',
      heading: '',
      align: 'right',
      width: 64,
      cell: (item) => (
        <ReportActions
          item={item}
          mobileOpen={mobileActionId === item.id}
          onMobileOpenChange={(open) => setMobileActionId(open ? item.id : undefined)}
          onView={closeAndView}
          onRemit={closeAndRemit}
          onDelete={closeAndDelete}
          canManage={isAdmin}
          disabled={actionsDisabled}
          mobile={false}
        />
      ),
    },
  ]

  return (
    <section className="flex flex-col gap-3" aria-label="Reports">
      {loading ? (
        <div className="rounded-card bg-card flex min-h-40 items-center justify-center shadow-card">
          <Spinner />
        </div>
      ) : unavailable ? (
        <div className="rounded-card bg-card flex min-h-40 flex-col items-center justify-center gap-2 p-4 text-center shadow-card">
          <p className="text-text-heading font-medium">Reports are unavailable</p>
          <p className="text-text-secondary text-sm">
            Reports are not stored for offline access. Connect and try again.
          </p>
        </div>
      ) : error ? (
        <div className="rounded-card bg-card flex min-h-40 flex-col items-center justify-center gap-2 p-4 text-center shadow-card">
          <p className="text-text-heading font-medium">Reports could not be loaded</p>
          <p className="text-text-secondary text-sm">Check your connection and try again.</p>
          <Button type="button" variant="outline" size="sm" onClick={onRetry}>
            Retry
          </Button>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-card bg-card flex min-h-40 flex-col items-center justify-center gap-2 p-4 text-center shadow-card">
          <span className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-full">
            <FileText className="size-6" aria-hidden="true" />
          </span>
          <div className="flex flex-col gap-1">
            <p className="text-text-heading font-medium">No reports found</p>
            <p className="text-text-secondary text-sm">
              Generated reports in this period will appear here.
            </p>
          </div>
        </div>
      ) : (
        <>
          <ul
            className="rounded-card bg-card overflow-hidden shadow-card md:hidden"
          >
            {items.map((item) => (
              <li key={item.id} className="border-border/60 border-b last:border-b-0">
                <button
                  type="button"
                  onClick={() => setMobileActionId(item.id)}
                  className="hover:bg-surface-hover focus-visible:bg-surface-hover focus-visible:ring-ring/30 flex min-h-24 w-full items-stretch text-left outline-none focus-visible:ring-3 focus-visible:ring-inset"
                  aria-label={`Open actions for report dated ${formatDate(item.toDate)}`}
                >
                  <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 text-left sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:px-4">
                    <span className="bg-primary/10 text-primary hidden size-11 shrink-0 items-center justify-center rounded-full sm:flex">
                      <FileText className="size-5" aria-hidden="true" />
                    </span>
                    <span className="flex min-w-0 flex-col gap-1">
                      <span className="text-text-heading font-medium">{formatDate(item.toDate)}</span>
                      <span className="text-text-tertiary text-xs">
                        prints: {item.totalPrintCount.toLocaleString()}
                      </span>
                      {!dayjsLocal(item.fromDate).isSame(
                        dayjsLocal(item.toDate),
                        'day'
                      ) && (
                        <span className="text-text-tertiary truncate text-sm">
                          {formatRange(dayjsLocal(item.fromDate), dayjsLocal(item.toDate))}
                        </span>
                      )}
                      <span className="text-text-tertiary hidden text-xs sm:block">
                        Cash {formatCurrency(item.totalCash)} · Online{' '}
                        {formatCurrency(item.totalOnline)} · Expenses{' '}
                        {formatCurrency(item.totalExpenses)}
                      </span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="flex flex-col items-end gap-2">
                        <span className="font-semibold whitespace-nowrap">
                          {formatCurrency(item.netIncome)}
                        </span>
                        <Status remitted={item.isRemitted} />
                      </span>
                    </span>
                  </div>
                  <span className="flex items-center pr-3">
                    <ChevronRight className="text-text-tertiary size-5" aria-hidden="true" />
                  </span>
                </button>
                <ReportActions
                  item={item}
                  mobileOpen={mobileActionId === item.id}
                  onMobileOpenChange={(open) =>
                    setMobileActionId(open ? item.id : undefined)
                  }
                  onView={closeAndView}
                  onRemit={closeAndRemit}
                  onDelete={closeAndDelete}
                  canManage={isAdmin}
                  disabled={actionsDisabled}
                  showMobileTrigger={false}
                />
              </li>
            ))}
          </ul>

          <div className="hidden md:block">
            <DataTable
              collection={DataTable.collection({
                items,
                itemToValue: (item) => item.id,
                itemToString: (item) => `Report for ${formatDate(item.toDate)}`,
              })}
              columns={columns}
            />
          </div>

        </>
      )}

      {!loading && !error && pageCount > 1 && (
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-text-secondary text-sm">
            {firstItem}–{lastItem} of {totalCount} reports · Page {page} of {pageCount}
          </p>
          <div className="flex w-full gap-2 sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-none"
              disabled={page <= 1 || fetching}
              onClick={() => onPageChange(page - 1)}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-none"
              disabled={page >= pageCount || fetching}
              onClick={() => onPageChange(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}
