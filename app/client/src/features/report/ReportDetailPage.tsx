'use client'

import { useState } from 'react'
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

const ReportDetailPage = () => {
  const { reportId } = useParams<{ reportId: string }>()
  const router = useRouter()
  const { data: report, isLoading } = useReport(reportId)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const { auth } = useAuthContext()
  const isAdmin = auth?.role === UserRole.ADMIN

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-5 md:p-6">
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
        <ReportDisplay
          report={report}
          onDelete={isAdmin ? () => setDeleteOpen(true) : undefined}
        />
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
