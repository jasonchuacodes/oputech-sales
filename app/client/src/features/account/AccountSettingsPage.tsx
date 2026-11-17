'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { AtSign, KeyRound } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, type ComponentProps } from 'react'
import { useForm, type UseFormRegisterReturn } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  Button,
  ConfirmationDialog,
  ContentSection,
  Input,
  Label,
  PageHeader,
  PasswordInput,
  SectionTabs,
  Spinner,
  type SectionTabOption,
} from '@/components'
import { useAuthContext } from '@/context/auth/useAuthContext'
import { useDisclosure } from '@/hooks/useDisclosure'
import {
  useMyProfile,
  useUpdateMyProfile,
} from '@/services/account/account.queries'
import { AccountProfile } from '@/services/account/account.types'
import { UserRole } from '@/types'
import {
  changePasswordSchema,
  profileFormSchema,
  type ChangePasswordValues,
  type ProfileFormValues,
} from './schemas/account-settings.schema'

type AccountTab = 'account' | 'security'

const accountTabs = [
  {
    id: 'account-tab',
    panelId: 'account-panel',
    label: 'Account',
    value: 'account',
  },
  {
    id: 'security-tab',
    panelId: 'security-panel',
    label: 'Security',
    value: 'security',
  },
] as const satisfies readonly SectionTabOption<AccountTab>[]

export const AccountSettingsPage = () => {
  const { auth, loading } = useAuthContext()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<AccountTab>('account')
  const canManageAccount =
    auth?.role === UserRole.ADMIN || auth?.role === UserRole.SUPERADMIN

  useEffect(() => {
    if (!loading && auth && !canManageAccount) router.replace('/me')
  }, [auth, canManageAccount, loading, router])

  if (loading || !auth || !canManageAccount) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-5 py-5 md:px-6 md:py-8">
      <PageHeader
        title="Account settings"
        description="Manage your account information and security settings."
        backHref="/me"
        backLabel="Back to Me"
      />

      <SectionTabs
        ariaLabel="Account settings"
        tabs={accountTabs}
        value={activeTab}
        onValueChange={setActiveTab}
      />

      <div
        id="account-panel"
        role="tabpanel"
        aria-labelledby="account-tab"
        className="w-full max-w-2xl"
        hidden={activeTab !== 'account'}
      >
        <ProfilePanel />
      </div>

      <div
        id="security-panel"
        role="tabpanel"
        aria-labelledby="security-tab"
        className="w-full max-w-2xl"
        hidden={activeTab !== 'security'}
      >
        <PasswordForm />
      </div>
    </div>
  )
}

const ProfilePanel = () => {
  const profile = useMyProfile()

  if (profile.isPending) {
    return (
      <div className="flex min-h-48 items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (profile.isError) {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-center">
        <p className="text-text-secondary text-sm">
          Unable to load your account details.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void profile.refetch()}
        >
          Try again
        </Button>
      </div>
    )
  }

  return <ProfileForm key={profile.data.id} profile={profile.data} />
}

const ProfileForm = ({ profile }: { profile: AccountProfile }) => {
  const updateProfile = useUpdateMyProfile()
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty, isValid },
  } = useForm<ProfileFormValues>({
    defaultValues: {
      firstName: profile.firstName ?? '',
      lastName: profile.lastName ?? '',
    },
    mode: 'onChange',
    resolver: zodResolver(profileFormSchema),
  })

  const submit = handleSubmit(async (values) => {
    try {
      const updated = await updateProfile.mutateAsync({
        firstName: values.firstName || null,
        lastName: values.lastName || null,
      })
      reset({
        firstName: updated.firstName ?? '',
        lastName: updated.lastName ?? '',
      })
      toast.success('Profile updated successfully')
    } catch {
      setError('root', {
        message: 'Unable to update your profile. Please try again.',
      })
    }
  })

  return (
    <form className="flex flex-col gap-6" noValidate onSubmit={submit}>
      <ContentSection label="Account">
        <div className="rounded-card border-border bg-card shadow-card flex flex-col gap-5 border p-5 sm:p-6">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="profile-username">Username</Label>
            <div className="relative">
              <AtSign
                aria-hidden="true"
                className="text-text-tertiary pointer-events-none absolute top-1/2 left-3.5 z-10 size-5 -translate-y-1/2"
              />
              <Input
                id="profile-username"
                className="bg-muted h-14 cursor-default pl-11 text-base disabled:cursor-default disabled:opacity-100"
                value={profile.username}
                disabled
                readOnly
                aria-disabled="true"
                aria-readonly="true"
              />
            </div>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row">
            <ProfileField
              id="profile-first-name"
              label="First name"
              autoComplete="given-name"
              error={errors.firstName?.message}
              disabled={updateProfile.isPending}
              registration={register('firstName')}
            />
            <ProfileField
              id="profile-last-name"
              label="Last name"
              autoComplete="family-name"
              error={errors.lastName?.message}
              disabled={updateProfile.isPending}
              registration={register('lastName')}
            />
          </div>

          {errors.root?.message && (
            <p role="alert" className="text-danger text-sm">
              {errors.root.message}
            </p>
          )}
        </div>
      </ContentSection>

      <footer className="flex gap-3">
        <Button asChild variant="outline" size="lg" className="flex-1">
          <Link href="/me">Cancel</Link>
        </Button>
        <Button
          type="submit"
          size="lg"
          className="flex-1"
          disabled={!isDirty || !isValid || updateProfile.isPending}
        >
          {updateProfile.isPending && <Spinner size="xs" variant="current" />}
          {updateProfile.isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </footer>
    </form>
  )
}

const PasswordForm = () => {
  const { changePassword } = useAuthContext()
  const confirmation = useDisclosure()
  const passwordMutation = useMutation({ mutationFn: changePassword })
  const {
    register,
    handleSubmit,
    getValues,
    setError,
    formState: { errors, isValid },
  } = useForm<ChangePasswordValues>({
    defaultValues: { currentPassword: '', newPassword: '' },
    mode: 'onChange',
    resolver: zodResolver(changePasswordSchema),
  })

  const submit = handleSubmit(() => confirmation.onOpen())

  const confirmUpdate = async () => {
    try {
      await passwordMutation.mutateAsync(getValues())
      confirmation.onClose()
      toast.success('Password updated. Sign in with your new password.')
    } catch (error) {
      confirmation.onClose()
      if (isAxiosError(error) && error.response?.status === 401) {
        setError(
          'currentPassword',
          { message: 'The current password is incorrect.' },
          { shouldFocus: true }
        )
        return
      }
      setError('root', {
        message: 'Unable to update your password. Please try again.',
      })
    }
  }

  return (
    <>
      <form className="flex flex-col gap-6" noValidate onSubmit={submit}>
        <ContentSection label="Password">
          <div className="rounded-card border-border bg-card shadow-card border p-5 sm:p-6">
            <p className="text-text-secondary text-sm">
              Change your password to keep your account secure.
            </p>

            <div className="mt-5 flex flex-col gap-4">
              <PasswordField
                id="account-current-password"
                label="Current password"
                autoComplete="current-password"
                error={errors.currentPassword?.message}
                disabled={passwordMutation.isPending}
                registration={register('currentPassword')}
              />
              <PasswordField
                id="account-new-password"
                label="New password"
                autoComplete="new-password"
                error={errors.newPassword?.message}
                disabled={passwordMutation.isPending}
                registration={register('newPassword')}
              />

              {errors.root?.message && (
                <p role="alert" className="text-danger text-sm">
                  {errors.root.message}
                </p>
              )}
            </div>
          </div>
        </ContentSection>

        <footer className="flex gap-3">
          <Button asChild variant="outline" size="lg" className="flex-1">
            <Link href="/me">Cancel</Link>
          </Button>
          <Button
            type="submit"
            size="lg"
            className="flex-1"
            disabled={!isValid || passwordMutation.isPending}
          >
            Update password
          </Button>
        </footer>
      </form>

      <ConfirmationDialog
        open={confirmation.open}
        title="Update password?"
        description="You will be signed out on all devices and must sign in with your new password."
        icon={KeyRound}
        confirmText="Update password"
        loading={passwordMutation.isPending}
        onClose={confirmation.onClose}
        onConfirm={() => void confirmUpdate()}
      />
    </>
  )
}

type FieldProps = {
  id: string
  label: string
  autoComplete?: ComponentProps<'input'>['autoComplete']
  error?: string
  disabled: boolean
  registration: UseFormRegisterReturn
}

const ProfileField = ({
  id,
  label,
  autoComplete,
  error,
  disabled,
  registration,
}: FieldProps) => (
  <div className="flex flex-1 flex-col gap-1.5">
    <Label htmlFor={id}>{label}</Label>
    <Input
      id={id}
      maxLength={80}
      autoComplete={autoComplete}
      className="h-14 text-base"
      disabled={disabled}
      aria-invalid={Boolean(error)}
      aria-describedby={error ? `${id}-error` : undefined}
      {...registration}
    />
    {error && (
      <p id={`${id}-error`} role="alert" className="text-danger text-sm">
        {error}
      </p>
    )}
  </div>
)

const PasswordField = ({
  id,
  label,
  autoComplete,
  error,
  disabled,
  registration,
}: FieldProps) => (
  <div className="flex flex-col gap-1.5">
    <Label htmlFor={id}>{label}</Label>
    <PasswordInput
      id={id}
      autoComplete={autoComplete}
      className="h-14"
      disabled={disabled}
      aria-invalid={Boolean(error)}
      aria-describedby={error ? `${id}-error` : undefined}
      {...registration}
    />
    {error && (
      <p id={`${id}-error`} role="alert" className="text-danger text-sm">
        {error}
      </p>
    )}
  </div>
)
