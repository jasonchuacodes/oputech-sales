'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button, Input, Label, PasswordInput } from '../../components'
import { Footer } from './components/Footer'
import { LoginLayout } from './components/LoginLayout'
import { useLoginMutation } from '../../services/auth/auth.queries'
import { useAuthContext } from '../../context/auth/useAuthContext'
import { LoginInput } from '../../services/auth/auth.types'
import { loginSchema } from './schemas/login.schema'
import { UserRole } from '../../types'
import { getApiErrorMessage } from '../../lib/api-error'

export default function LoginPage() {
  const { auth, loading, refetch: refetchAuth } = useAuthContext()
  const router = useRouter()

  const [error, setError] = useState<string | null>(null)

  const {
    handleSubmit,
    reset,
    register,
    formState: { errors, isValid },
  } = useForm({
    resolver: zodResolver(loginSchema),
  })

  const { mutate: login, isPending } = useLoginMutation()

  const onSubmit = (data: LoginInput) => {
    login(data, {
      onSuccess: async ({ user }) => {
        await refetchAuth()
        setError(null)
        router.replace(user.role === UserRole.STAFF ? '/sell' : '/dashboard')
      },
      onError: (err) => {
        setError(getApiErrorMessage(err, 'Unable to sign in. Please try again.'))
      },
      onSettled: () => {
        reset()
      },
    })
  }

  useEffect(() => {
    if (!loading && auth) {
      router.replace(auth.role === UserRole.STAFF ? '/sell' : '/dashboard')
    }
  }, [auth, loading, router])

  return (
    <LoginLayout>
      <main className="flex h-full min-h-full flex-col px-5 py-6">
        <div className="flex flex-1 flex-col items-center justify-center">
          <div className="w-full max-w-sm">
            <div className="rounded-card bg-card p-6 shadow-card sm:p-8">
              <div className="mb-6 flex justify-center">
                <div
                  className="flex size-14 items-center justify-center rounded-card bg-primary text-lg font-bold text-primary-foreground"
                  aria-label="Oputech Sales"
                >
                  OS
                </div>
              </div>
              <div className="mb-8 text-center">
                <h1 className="text-foreground text-2xl font-bold">
                  Oputech Sales
                </h1>
                <p className="text-md mt-1 text-gray-500">
                  Sign in to manage today&apos;s business.
                </p>
              </div>
              <form
                className="flex flex-col gap-5"
                onSubmit={handleSubmit((data) => onSubmit(data))}
              >
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter your username"
                    autoComplete="username"
                    {...register('username')}
                  />
                  {errors.username && (
                    <p className="text-sm text-red-500">
                      {errors.username.message}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="password">Password</Label>
                  <PasswordInput
                    id="password"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    {...register('password')}
                  />
                  {errors.password && (
                    <p className="text-sm text-red-500">
                      {errors.password.message}
                    </p>
                  )}
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <Button
                  type="submit"
                  size="lg"
                  className="mt-1 w-full"
                  disabled={!isValid}
                >
                  {isPending ? 'Signing in…' : 'Sign in'}
                </Button>
              </form>
            </div>
          </div>
        </div>
        <Footer />
      </main>
    </LoginLayout>
  )
}
