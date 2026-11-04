import { Trash2 } from 'lucide-react'
import { ConfirmationDialog } from '../../../components'
import { useDeleteProduct } from '../../../services/product/product.queries'
import { Product } from '../../../services/product/product.types'

interface Props {
  item: Product | null
  open: boolean
  onClose: () => void
}

export const DeleteConfirmModal = ({ item, open, onClose }: Props) => {
  const deleteItem = useDeleteProduct()

  const handleConfirm = () => {
    if (!item) return
    deleteItem.mutate(item.id, { onSuccess: onClose })
  }

  return (
    <ConfirmationDialog
      open={open}
      title="Delete Item"
      icon={Trash2}
      variant="danger"
      confirmText="Delete"
      description={
        <p className="text-sm">
          Are you sure you want to delete{' '}
          <span className="text-destructive font-semibold">{item?.name}</span>?
          This action cannot be undone.
        </p>
      }
      loading={deleteItem.isPending}
      onClose={onClose}
      onConfirm={handleConfirm}
    />
  )
}
