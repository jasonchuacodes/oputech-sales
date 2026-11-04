'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '../../components/ui/page-header'
import { Button } from '../../components'
import { useReport } from '../../services/report/report.queries'
import { ReportDisplay } from './components/ReportDisplay'
import { DeleteConfirmModal } from './components/DeleteConfirmModal'
import { UserRoutes } from '../../routes/paths'

const ReportDetailPage = () => {
  const { reportId } = useParams<{ reportId: string }>()
  const router = useRouter()
  const { data: report, isLoading } = useReport(reportId)
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-5 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Report Detail"
          description="View a generated report"
        />
        <Button
          variant="outline"
          className="w-full gap-2 sm:w-auto"
          onClick={() => router.push(UserRoutes.Reports)}
        >
          <ArrowLeft size={16} />
          Back to Reports
        </Button>
      </div>

      {isLoading ? (
        <div className="h-48 animate-pulse rounded-lg border bg-slate-100" />
      ) : !report ? (
        <div className="flex flex-col items-center gap-2 py-20 text-center">
          <p className="text-lg font-medium text-slate-700">
            Report not found
          </p>
          <p className="text-sm text-slate-400">
            This report may have been deleted.
          </p>
        </div>
      ) : (
        <ReportDisplay report={report} onDelete={() => setDeleteOpen(true)} />
      )}

      <DeleteConfirmModal
        item={report ?? null}
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onDeleted={() => router.push(UserRoutes.Reports)}
      />
    </div>
  )
}

export default ReportDetailPage
