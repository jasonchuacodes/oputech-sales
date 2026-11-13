'use client'

import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { PageHeader } from '../../components/ui/page-header'
import { Button } from '../../components'
import { useReport } from '../../services/report/report.queries'
import { ReportDisplay } from './components/ReportDisplay'
import { DeleteConfirmModal } from './components/DeleteConfirmModal'
import { UserRoutes } from '../../routes/paths'
import { useAuthContext } from '../../context/auth/useAuthContext'
import { UserRole } from '../../types'
import { useDisclosure } from '../../hooks/useDisclosure'
import { useTenantContext } from '../../context/tenant/useTenantContext'
import { TenantType } from '../../services/tenant/tenant.types'

const ReportDetailPage = () => {
  const { reportId } = useParams<{ reportId: string }>()
  const router = useRouter()
  const reportQuery = useReport(reportId)
  const { data: report } = reportQuery
  const deleteReport = useDisclosure()
  const { auth } = useAuthContext()
  const { currentTenant } = useTenantContext()
  const isAdmin = auth?.role !== UserRole.STAFF

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-5 py-5 md:p-6">
      <div className="flex items-start gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          className="mt-0.5"
          aria-label="Back to Reports"
          onClick={() => router.push(UserRoutes.Reports)}
        >
          <ChevronLeft />
        </Button>
        <PageHeader
          title="Report Detail"
          description="View a generated report"
        />
      </div>

      {reportQuery.isPending && reportQuery.fetchStatus === 'fetching' ? (
        <div className="h-48 animate-pulse rounded-lg border bg-slate-100" />
      ) : !report &&
        (reportQuery.isError || reportQuery.fetchStatus === 'paused') ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <p className="text-lg font-medium text-slate-700">
            Report could not be loaded
          </p>
          <p className="text-sm text-slate-400">
            Reports are not stored for offline access on this device.
          </p>
          <Button variant="outline" onClick={() => void reportQuery.refetch()}>
            Retry
          </Button>
        </div>
      ) : !report ? (
        <div className="flex flex-col items-center gap-2 py-20 text-center">
          <p className="text-lg font-medium text-slate-700">Report not found</p>
          <p className="text-sm text-slate-400">
            This report may have been deleted.
          </p>
        </div>
      ) : (
        <ReportDisplay
          report={report}
          showPrintCount={currentTenant?.type === TenantType.PHOTO}
          onDelete={
            isAdmin || !report.isRemitted ? deleteReport.onOpen : undefined
          }
        />
      )}

      <DeleteConfirmModal
        item={report ?? null}
        open={deleteReport.open}
        onClose={deleteReport.onClose}
        onDeleted={() => router.push(UserRoutes.Reports)}
      />
    </div>
  )
}

export default ReportDetailPage
