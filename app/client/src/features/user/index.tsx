'use client'

import { useState } from 'react'
import { Plus, UserRound } from 'lucide-react'
import { Button, PageHeader } from '../../components'
import { DataTable, DataTableColumn } from '../../components/ui/data-table'
import { useUsers } from '../../services/users/users.queries'
import { User } from '../../services/users/users.types'
import { AddUserModal } from './components/AddUserModal'
import { EditUserModal } from './components/EditUserModal'
import { DeleteUserModal } from './components/DeleteUserModal'
import { ResetPasswordModal } from './components/ResetPasswordModal'
import { ActionsDropdown } from './components/ActionsDropdown'
import { useDisclosure } from '../../hooks/useDisclosure'

const UsersPage = () => {
  const { data, isPending, isError, fetchStatus, refetch } = useUsers()
  const isLoading = isPending && fetchStatus === 'fetching'
  const unavailable = !data && (isError || fetchStatus === 'paused')
  const addUser = useDisclosure()
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const editUser = useDisclosure()
  const deleteUser = useDisclosure()
  const resetPassword = useDisclosure()

  const openEdit = (user: User) => {
    setSelectedUser(user)
    editUser.onOpen()
  }

  const openDelete = (user: User) => {
    setSelectedUser(user)
    deleteUser.onOpen()
  }

  const openResetPassword = (user: User) => {
    setSelectedUser(user)
    resetPassword.onOpen()
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
      id: 'actions',
      heading: '',
      align: 'right',
      cell: (u) => (
        <div className="flex items-center justify-end gap-1">
          <ActionsDropdown
            onEdit={() => openEdit(u)}
            onResetPassword={() => openResetPassword(u)}
            onDelete={() => openDelete(u)}
          />
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
            onClick={addUser.onOpen}
          >
            <Plus size={16} />
            Add User
          </Button>
        }
      />

      {unavailable && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <p>Users are not cached on this device. Connect and try again.</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => void refetch()}
          >
            Retry
          </Button>
        </div>
      )}

      <div className="md:hidden">
        {isLoading ? (
          <div className="rounded-card bg-card h-28 animate-pulse shadow-card" />
        ) : unavailable ? null : (data?.length ?? 0) === 0 ? (
          <div className="rounded-card bg-card p-6 text-center text-sm text-text-secondary shadow-card">
            No users found
          </div>
        ) : (
          <ul className="rounded-card bg-card overflow-hidden shadow-card">
            {data?.map((user) => {
              return (
                <li
                  key={user.id}
                  className="border-border/60 flex min-h-24 items-center gap-3 border-b p-4 last:border-b-0"
                >
                  <span className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-full">
                    <UserRound className="size-5" aria-hidden="true" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="truncate font-semibold">
                      {user.fullName || user.username}
                    </span>
                    <span className="text-text-secondary truncate text-sm">
                      @{user.username} · {user.role === 'ADMIN' ? 'Administrator' : 'Staff'}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1">
                    <ActionsDropdown
                      onEdit={() => openEdit(user)}
                      onResetPassword={() => openResetPassword(user)}
                      onDelete={() => openDelete(user)}
                    />
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="hidden md:block">
        <DataTable
          collection={collection}
          columns={columns}
          loading={isLoading}
          emptyMessage="No users found"
        />
      </div>

      <AddUserModal open={addUser.open} onClose={addUser.onClose} />

      <EditUserModal
        user={selectedUser}
        open={editUser.open}
        onClose={() => {
          editUser.onClose()
          setSelectedUser(null)
        }}
      />

      <DeleteUserModal
        user={selectedUser}
        open={deleteUser.open}
        onClose={() => {
          deleteUser.onClose()
          setSelectedUser(null)
        }}
      />

      <ResetPasswordModal
        user={selectedUser}
        open={resetPassword.open}
        onClose={() => {
          resetPassword.onClose()
          setSelectedUser(null)
        }}
      />
    </div>
  )
}

export default UsersPage
