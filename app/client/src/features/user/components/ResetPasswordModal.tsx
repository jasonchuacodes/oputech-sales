import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { KeyRound } from 'lucide-react'
import { CustomModal, Input, Label } from '../../../components'
import { useResetPassword } from '../../../services/users/users.queries'
import { User } from '../../../services/users/users.types'
import { resetPasswordSchema, ResetPasswordFormValues } from '../schemas/reset-password.schema'

interface Props {
  user: User | null
  open: boolean
  onClose: () => void
}

export const ResetPasswordModal = ({ user, open, onClose }: Props) => {
  const resetPassword = useResetPassword()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<ResetPasswordFormValues>({ resolver: zodResolver(resetPasswordSchema) })

  const handleClose = () => {
    onClose()
    reset()
  }

  const onSubmit = (data: ResetPasswordFormValues) => {
    if (!user) return
    resetPassword.mutate(
      { id: user.id, password: data.password },
      { onSuccess: handleClose }
    )
  }

  return (
    <CustomModal
      open={open}
      title="Reset Password"
      subheader={`Set a new password for ${user?.username}.`}
      icon={KeyRound}
      submitText="Reset Password"
      loading={resetPassword.isPending}
      onClose={handleClose}
      onSubmit={handleSubmit(onSubmit)}
      disabled={!isValid}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reset-password">New Password *</Label>
        <Input
          id="reset-password"
          type="password"
          placeholder="Enter a new password"
          aria-invalid={!!errors.password}
          {...register('password')}
        />
        {errors.password && (
          <p className="text-destructive text-xs">{errors.password.message}</p>
        )}
      </div>
    </CustomModal>
  )
}
