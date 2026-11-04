'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button, PageHeader } from '../../components'
import { DataTable, DataTableColumn } from '../../components/ui/data-table'
import { useUsers } from '../../services/users/users.queries'
import { User, UserStatus } from '../../services/users/users.types'
import { AddUserModal } from './components/AddUserModal'
import { EditUserModal } from './components/EditUserModal'
import { DeleteUserModal } from './components/DeleteUserModal'
import { ResetPasswordModal } from './components/ResetPasswordModal'
import { ActionsDropdown } from './components/ActionsDropdown'
import { cn } from '../../utils/cn'
import { useSyncContext } from '../../context/sync/useSyncContext'

const UsersPage = () => {
  const { data, isLoading } = useUsers()
  const { canUseOnlineFeatures } = useSyncContext()
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false)

  const openEdit = (user: User) => {
    setSelectedUser(user)
    setEditOpen(true)
  }

  const openDelete = (user: User) => {
    setSelectedUser(user)
    setDeleteOpen(true)
  }

  const openResetPassword = (user: User) => {
    setSelectedUser(user)
    setResetPasswordOpen(true)
  }

  const columns: DataTableColumn<User>[] = [
    {
      id: 'username',
      heading: 'Username',
      cell: (u) => u.username,
      orderable: true,
    },
    {
      id: 'fullName',
      heading: 'Full Name',
      cell: (u) => u.fullName ?? '—',
      orderable: true,
    },
    {
      id: 'email',
      heading: 'Email',
      cell: (u) => u.email ?? '—',
      orderable: true,
    },
    {
      id: 'role',
      heading: 'Role',
      cell: (u) => u.role,
      orderable: true,
    },
    {
      id: 'status',
      heading: 'Status',
      cell: (u) => (
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'h-2 w-2 shrink-0 rounded-full',
              u.activityStatus.status === UserStatus.Active ? 'bg-green-500' : 'bg-gray-400'
            )}
          />
          <span className="text-sm">
            {u.activityStatus.message ??
              (u.activityStatus.status === UserStatus.Active ? 'Active' : 'Inactive')}
          </span>
        </div>
      ),
    },
    {
      id: 'actions',
      heading: '',
      align: 'right',
      cell: (u) => (
        <div className="flex items-center justify-end gap-1">
          {canUseOnlineFeatures && (
            <ActionsDropdown
              onEdit={() => openEdit(u)}
              onResetPassword={() => openResetPassword(u)}
              onDelete={() => openDelete(u)}
            />
          )}
        </div>
      ),
    },
  ]

  const collection = DataTable.collection({
    items: data ?? [],
    itemToValue: (u) => u.id,
    itemToString: (u) => u.username,
  })

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-5 md:p-6">
      <PageHeader
        title="Users"
        description="Manage access, roles, and activity"
        action={
          <Button
            className="gap-2"
            disabled={!canUseOnlineFeatures}
            onClick={() => setModalOpen(true)}
          >
            <Plus size={16} />
            Add User
          </Button>
        }
      />

      {!canUseOnlineFeatures && (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          User administration is available after this device is online and fully synced.
        </p>
      )}

      <DataTable
        collection={collection}
        columns={columns}
        loading={isLoading}
        emptyMessage="No users found"
      />

      <AddUserModal open={modalOpen} onClose={() => setModalOpen(false)} />

      <EditUserModal
        user={selectedUser}
        open={editOpen}
        onClose={() => {
          setEditOpen(false)
          setSelectedUser(null)
        }}
      />

      <DeleteUserModal
        user={selectedUser}
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false)
          setSelectedUser(null)
        }}
      />

      <ResetPasswordModal
        user={selectedUser}
        open={resetPasswordOpen}
        onClose={() => {
          setResetPasswordOpen(false)
          setSelectedUser(null)
        }}
      />
    </div>
  )
}

export default UsersPage
