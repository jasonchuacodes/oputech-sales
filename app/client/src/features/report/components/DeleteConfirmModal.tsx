import { Trash2 } from 'lucide-react'
import { ConfirmationDialog } from '../../../components'
import { useDeleteReport } from '../../../services/report/report.queries'
import { ReportDeleteTarget } from '../../../services/report/report.types'
import { dayjsLocal, formatRange } from '../../../utils/date'

interface Props {
  item: ReportDeleteTarget | null
  open: boolean
  onClose: () => void
  onDeleted?: () => void
}

export const DeleteConfirmModal = ({ item, open, onClose, onDeleted }: Props) => {
  const deleteItem = useDeleteReport()

  const handleConfirm = () => {
    if (!item) return
    deleteItem.mutate(item.id, {
      onSuccess: () => {
        onClose()
        onDeleted?.()
      },
    })
  }

  return (
    <ConfirmationDialog
      open={open}
      title="Delete Report"
      icon={Trash2}
      variant="danger"
      confirmText="Delete"
      description={
        <p className="text-sm">
          Are you sure you want to delete the report for{' '}
          <span className="text-destructive font-semibold">
            {item &&
              formatRange(dayjsLocal(item.fromDate), dayjsLocal(item.toDate))}
          </span>
          ? The underlying transactions will return to unprocessed activity.
          This action cannot be undone.
        </p>
      }
      loading={deleteItem.isPending}
      onClose={onClose}
      onConfirm={handleConfirm}
    />
  )
}
