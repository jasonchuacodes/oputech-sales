import { useForm, Controller } from 'react-hook-form'
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

interface Props {
  open: boolean
  onClose: () => void
}

export const AddUserModal = ({ open, onClose }: Props) => {
  const createUser = useCreateUser()

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { isValid, errors },
  } = useForm<AddUserFormValues>({
    defaultValues: { role: UserRole.User },
    resolver: zodResolver(addUserSchema),
  })

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
                options={Object.values(UserRole).map((role) => ({
                  value: role,
                  label: role === UserRole.Admin ? 'Administrator' : 'Sales user',
                }))}
              />
            )}
          />
        </div>
      </div>
    </CustomModal>
  )
}
