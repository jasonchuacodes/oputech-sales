import { useEffect } from 'react'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Pencil } from 'lucide-react'
import {
  CustomModal,
  Input,
  Label,
  SheetSelect,
} from '../../../components'
import { useUpdateUser } from '../../../services/users/users.queries'
import { User, UserRole } from '../../../services/users/users.types'
import { editUserSchema, EditUserFormValues } from '../schemas/edit-user.schema'
import { useTenantContext } from '../../../context/tenant/useTenantContext'

interface Props {
  user: User | null
  open: boolean
  onClose: () => void
}

export const EditUserModal = ({ user, open, onClose }: Props) => {
  const updateUser = useUpdateUser()
  const tenant = useTenantContext()

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isValid },
  } = useForm<EditUserFormValues>({ resolver: zodResolver(editUserSchema) })
  const selectedRole = useWatch({ control, name: 'role' })

  useEffect(() => {
    if (user) {
      reset({
        username: user.username,
        fullName: user.fullName ?? '',
        email: user.email ?? '',
        role: user.role as UserRole.Admin | UserRole.Staff,
        tenantIds: user.tenantIds,
      })
    }
  }, [user, reset])

  const handleClose = () => {
    onClose()
    reset()
  }

  const onSubmit = (data: EditUserFormValues) => {
    if (!user) return
    updateUser.mutate(
      {
        id: user.id,
        input: {
          username: data.username,
          fullName: data.fullName || undefined,
          email: data.email || undefined,
          role: data.role,
          tenantIds: data.tenantIds,
        },
      },
      { onSuccess: handleClose }
    )
  }

  return (
    <CustomModal
      open={open}
      title="Edit User"
      subheader="Update this user's account details."
      icon={Pencil}
      submitText="Save"
      loading={updateUser.isPending}
      onClose={handleClose}
      onSubmit={handleSubmit(onSubmit)}
      disabled={!isValid}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-username">Username *</Label>
          <Input
            id="edit-username"
            placeholder="e.g. johndoe"
            aria-invalid={!!errors.username}
            {...register('username')}
          />
          {errors.username && (
            <p className="text-destructive text-xs">
              {errors.username.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-fullname">Full Name</Label>
          <Input
            id="edit-fullname"
            placeholder="e.g. John Doe"
            aria-invalid={!!errors.fullName}
            {...register('fullName')}
          />
          {errors.fullName && (
            <p className="text-destructive text-xs">
              {errors.fullName.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-email">Email</Label>
          <Input
            id="edit-email"
            type="email"
            placeholder="e.g. johndoe@example.com"
            aria-invalid={!!errors.email}
            {...register('email')}
          />
          {errors.email && (
            <p className="text-destructive text-xs">{errors.email.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Role</Label>
          <Controller
            name="role"
            control={control}
            render={({ field }) => (
              <SheetSelect
                value={field.value}
                onValueChange={field.onChange}
                title="Choose a role"
                placeholder="Select a role…"
                options={[UserRole.Admin, UserRole.Staff].map((role) => ({
                  value: role,
                  label: role === UserRole.Admin ? 'Administrator' : 'Staff',
                }))}
              />
            )}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label>Tenant assignments</Label>
          <Controller
            name="tenantIds"
            control={control}
            render={({ field }) => (
              <div className="flex flex-col gap-2">
                {tenant.tenants.map((item) => (
                  <label key={item.id} className="flex min-h-11 items-center gap-3 rounded-md border px-3">
                    <input
                      type="checkbox"
                      checked={field.value.includes(item.id)}
                      onChange={(event) =>
                        field.onChange(
                          event.target.checked
                            ? selectedRole === UserRole.Staff
                              ? [item.id]
                              : [...field.value, item.id]
                            : field.value.filter((id) => id !== item.id),
                        )
                      }
                    />
                    {item.name}
                  </label>
                ))}
              </div>
            )}
          />
          {errors.tenantIds && (
            <p className="text-destructive text-xs">{errors.tenantIds.message}</p>
          )}
        </div>
      </div>
    </CustomModal>
  )
}
