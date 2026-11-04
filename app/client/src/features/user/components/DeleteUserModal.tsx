import { Trash2 } from 'lucide-react'
import { CustomModal } from '../../../components'
import { useDeleteUser } from '../../../services/users/users.queries'
import { User } from '../../../services/users/users.types'

interface Props {
  user: User | null
  open: boolean
  onClose: () => void
}

export const DeleteUserModal = ({ user, open, onClose }: Props) => {
  const deleteUser = useDeleteUser()

  const handleConfirm = () => {
    if (!user) return
    deleteUser.mutate(user.id, { onSuccess: onClose })
  }

  return (
    <CustomModal
      open={open}
      title="Delete User"
      icon={Trash2}
      type="danger"
      submitText="Delete"
      subheader={
        <p className="text-sm">
          Are you sure you want to delete{' '}
          <span className="text-destructive font-semibold">{user?.username}</span>?
          This action cannot be undone.
        </p>
      }
      loading={deleteUser.isPending}
      onClose={onClose}
      onSubmit={handleConfirm}
    />
  )
}
