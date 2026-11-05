'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '../../components/ui/page-header'
import { SheetSelect } from '../../components/ui/sheet-select'
import { useRemit, useReportsPage } from '../../services/report/report.queries'
import type {
  ReportDeleteTarget,
  ReportListItem,
  ReportSortOrder,
} from '../../services/report/report.types'
import { reportDetailPath } from '../../routes/paths'
import { useAuthContext } from '../../context/auth/useAuthContext'
import { UserRole } from '../../types'
import { useDisclosure } from '../../hooks/useDisclosure'
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
  const isAdmin = auth?.role !== UserRole.STAFF
  const [preset, setPreset] = useState<ReportFilterPreset>('this_month')
  const [range, setRange] = useState<ReportCalendarRange>(() =>
    getReportPresetRange('this_month')
  )
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState<ReportSortOrder>('DATE_DESC')
  const [selectedReport, setSelectedReport] =
    useState<ReportDeleteTarget | null>(null)
  const deleteReport = useDisclosure()

  const queryParams = useMemo(
    () => ({
      filter: { dateRange: toReportDateRangeInput(range) },
      pagination: { page, pageSize: PAGE_SIZE },
      sort,
    }),
    [page, range, sort]
  )
  const reportsQuery = useReportsPage(queryParams)
  const remitReport = useRemit()

  const applyFilter = (
    nextPreset: ReportFilterPreset,
    customRange?: ReportCalendarRange
  ) => {
    setPreset(nextPreset)
    setRange(
      nextPreset === 'custom'
        ? (customRange ?? range)
        : getReportPresetRange(nextPreset)
    )
    setPage(1)
  }

  const handleRemit = (item: ReportListItem) => {
    remitReport.mutate({ id: item.id, isRemitted: !item.isRemitted })
  }

  const handleDelete = (item: ReportDeleteTarget) => {
    setSelectedReport(item)
    deleteReport.onOpen()
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-5 md:p-6">
      <PageHeader
        title="Reports"
        description="Review generated reports, totals, and remittance status."
      />

      {reportsQuery.data && reportsQuery.data.totalCount > 0 && (
        <ReportSummary totals={reportsQuery.data.totals} />
      )}

      <div className="flex items-center gap-3">
        <ReportFilters preset={preset} range={range} onApply={applyFilter} />
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
        error={reportsQuery.isError && !reportsQuery.data}
        unavailable={
          reportsQuery.fetchStatus === 'paused' && !reportsQuery.data
        }
        isAdmin={isAdmin}
        actionsDisabled={remitReport.isPending}
        onPageChange={setPage}
        onRetry={() => void reportsQuery.refetch()}
        onView={(item) => router.push(reportDetailPath(item.id))}
        onRemit={handleRemit}
        onDelete={handleDelete}
      />

      <DeleteConfirmModal
        item={selectedReport}
        open={deleteReport.open}
        onDeleted={() => {
          if ((reportsQuery.data?.items.length ?? 0) === 1 && page > 1) {
            setPage(page - 1)
          }
        }}
        onClose={() => {
          deleteReport.onClose()
          setSelectedReport(null)
        }}
      />
    </div>
  )
}

export default ReportPage
