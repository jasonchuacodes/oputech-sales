import { useForm, Controller, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { UserPlus } from 'lucide-react'
import {
  CustomModal,
  Input,
  Label,
  SheetSelect,
} from '../../../components'
import { useCreateUser } from '../../../services/users/users.queries'
import { UserRole } from '../../../services/users/users.types'
import { addUserSchema, AddUserFormValues } from '../schemas/add-user.schema'
import { useTenantContext } from '../../../context/tenant/useTenantContext'

interface Props {
  open: boolean
  onClose: () => void
}

export const AddUserModal = ({ open, onClose }: Props) => {
  const createUser = useCreateUser()
  const tenant = useTenantContext()

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { isValid, errors },
  } = useForm<AddUserFormValues>({
    defaultValues: {
      role: UserRole.Staff,
      tenantIds: tenant.currentTenant ? [tenant.currentTenant.id] : [],
    },
    resolver: zodResolver(addUserSchema),
  })
  const selectedRole = useWatch({ control, name: 'role' })

  const handleClose = () => {
    onClose()
    reset()
  }

  const onSubmit = (data: AddUserFormValues) => {
    createUser.mutate(
      {
        username: data.username,
        password: data.password,
        role: data.role,
        tenantIds: data.tenantIds,
      },
      { onSuccess: handleClose }
    )
  }

  return (
    <CustomModal
      open={open}
      title="Add User"
      subheader="Create a new user account."
      icon={UserPlus}
      submitText="Create User"
      loading={createUser.isPending}
      onClose={handleClose}
      onSubmit={handleSubmit(onSubmit)}
      disabled={!isValid}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="username">Username *</Label>
          <Input
            id="username"
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
          <Label htmlFor="password">Password *</Label>
          <Input
            id="password"
            type="password"
            placeholder="Enter a password"
            aria-invalid={!!errors.password}
            {...register('password')}
          />
          {errors.password && (
            <p className="text-destructive text-xs">
              {errors.password.message}
            </p>
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
