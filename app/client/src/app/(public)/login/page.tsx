import type { Metadata } from 'next'
import LoginPage from '@/features/auth/Login'

export const metadata: Metadata = { title: 'Sign in' }

export default function LoginRoute() {
  return <LoginPage />
}
