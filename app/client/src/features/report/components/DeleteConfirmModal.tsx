import { Trash2 } from 'lucide-react'
import { CustomModal } from '../../../components'
import { useDeleteReport } from '../../../services/report/report.queries'
import { Report } from '../../../services/report/report.types'
import { dayjsLocal, formatRange } from '../../../utils/date'

interface Props {
  item: Report | null
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
    <CustomModal
      open={open}
      title="Delete Report"
      icon={Trash2}
      type="danger"
      submitText="Delete"
      subheader={
        <p className="text-sm">
          Are you sure you want to delete the report for{' '}
          <span className="text-destructive font-semibold">
            {item &&
              formatRange(dayjsLocal(item.fromDate), dayjsLocal(item.toDate))}
          </span>
          ? This action cannot be undone.
        </p>
      }
      loading={deleteItem.isPending}
      onClose={onClose}
      onSubmit={handleConfirm}
    />
  )
}
