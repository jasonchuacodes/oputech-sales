'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { Button, ContentSection } from '../../components'
import { PageHeader } from '../../components/ui/page-header'
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
import { useTenantContext } from '../../context/tenant/useTenantContext'
import { TenantType } from '../../services/tenant/tenant.types'

const PAGE_SIZE = 10
const EMPTY_REPORT_TOTALS = {
  totalCash: 0,
  totalOnline: 0,
  totalExpenses: 0,
  netIncome: 0,
}

const ReportPage = () => {
  const router = useRouter()
  const { auth } = useAuthContext()
  const { currentTenant } = useTenantContext()
  const showPrintCount = currentTenant?.type === TenantType.PHOTO
  const isAdmin = auth?.role !== UserRole.STAFF
  const canViewSummary =
    auth?.role === UserRole.ADMIN || auth?.role === UserRole.SUPERADMIN
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
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-5 py-5 md:p-6">
      <PageHeader
        title="Reports"
        description="Review generated reports, totals, and remittance status."
      />

      {canViewSummary && (
        <ReportSummary
          totals={reportsQuery.data?.totals ?? EMPTY_REPORT_TOTALS}
          action={
            <ReportFilters
              preset={preset}
              range={range}
              onApply={applyFilter}
            />
          }
        />
      )}

      <ContentSection
        label="Generated reports"
        rightContent={
          <div className="flex items-center gap-1.5">
            <span className="text-text-tertiary text-xs">Sort</span>
            <Button
              type="button"
              variant="ghost"
              className="text-text-secondary h-10 gap-1 px-1.5 text-sm"
              aria-label={
                sort === 'DATE_DESC'
                  ? 'Sort reports oldest first'
                  : 'Sort reports newest first'
              }
              onClick={() => {
                setSort(sort === 'DATE_DESC' ? 'DATE_ASC' : 'DATE_DESC')
                setPage(1)
              }}
            >
              {sort === 'DATE_DESC' ? 'Newest' : 'Oldest'}
              {sort === 'DATE_DESC' ? (
                <ArrowDown aria-hidden="true" />
              ) : (
                <ArrowUp aria-hidden="true" />
              )}
            </Button>
          </div>
        }
      >
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
          showPrintCount={showPrintCount}
          onPageChange={setPage}
          onRetry={() => void reportsQuery.refetch()}
          onView={(item) => router.push(reportDetailPath(item.id))}
          onRemit={handleRemit}
          onDelete={handleDelete}
        />
      </ContentSection>

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
