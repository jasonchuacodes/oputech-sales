import { Trash2 } from 'lucide-react'
import { ConfirmationDialog } from '../../../components'
import { useDeleteTransaction } from '../../../services/transaction/transaction.queries'
import { Transaction } from '../../../services/transaction/transaction.types'
import { formatCurrency } from '../../../utils/number'

interface Props {
  item: Transaction | null
  open: boolean
  onClose: () => void
}

export const DeleteConfirmModal = ({ item, open, onClose }: Props) => {
  const deleteItem = useDeleteTransaction()

  const handleConfirm = () => {
    if (!item) return
    deleteItem.mutate(item.id, { onSuccess: onClose })
  }

  return (
    <ConfirmationDialog
      open={open}
      title="Delete Transaction"
      icon={Trash2}
      variant="danger"
      confirmText="Delete"
      description={
        <p className="text-sm">
          Are you sure you want to delete this transaction totaling{' '}
          <span className="text-destructive font-semibold">
            {item && formatCurrency(item.total)}
          </span>
          ? This action cannot be undone.
        </p>
      }
      loading={deleteItem.isPending}
      onClose={onClose}
      onConfirm={handleConfirm}
    />
  )
}
