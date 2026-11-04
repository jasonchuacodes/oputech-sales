'use client'

import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { isAxiosError } from 'axios'

import { type AuthUser } from '../../services/auth/auth.types'
import { PublicRoutes } from '../../routes/paths'
import { useGetMe, useLogoutMutation } from '../../services/auth/auth.queries'
import { refresh } from '../../services/auth/auth.api'
import {
  clearCachedAuth,
  getCachedAuth,
  setCachedAuth,
  type CachedAuth,
} from '../../offline/database'

// Keep comfortably under the access-token TTL (currently 15m) so the
// access_token cookie is renewed before it ever expires under normal use.
const SESSION_POLL_INTERVAL_MS = 5 * 60 * 1000
const OFFLINE_SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

type AuthContextType = {
  auth?: AuthUser | null
  loading: boolean
  offlineSession: boolean
  refetch: () => Promise<unknown>
  logout: () => void
}

const initialState: AuthContextType = {
  auth: null,
  loading: true,
  offlineSession: false,
  refetch: async () => undefined,
  logout: () => null,
}

const AuthContext = createContext<AuthContextType>(initialState)

const isRejectedSession = (error: unknown) =>
  isAxiosError(error) &&
  (error.response?.status === 401 || error.response?.status === 403)

function AuthProvider({ children }: { children?: ReactNode }) {
  const {
    data: serverAuth,
    error,
    isLoading,
    refetch,
  } = useGetMe()
  const [cached, setCached] = useState<CachedAuth | null | undefined>(undefined)
  const [startedAt] = useState(() => Date.now())

  const queryClient = useQueryClient()
  const router = useRouter()

  const { mutate, isPending: isLoggingOut } = useLogoutMutation()

  const endSession = useCallback(async () => {
    await clearCachedAuth()
    setCached(null)
    queryClient.setQueryData(['auth'], null)
    queryClient.cancelQueries()

    router.replace(PublicRoutes.Login)
  }, [queryClient, router])

  const logout = useCallback(() => {
    mutate(undefined, { onSettled: () => void endSession() })
  }, [mutate, endSession])

  useEffect(() => {
    void getCachedAuth()
      .then((value) => setCached(value ?? null))
      .catch(() => setCached(null))
  }, [])

  useEffect(() => {
    if (!serverAuth) return
    const value = { user: serverAuth, validatedAt: new Date().toISOString() }
    void setCachedAuth(value).then(() => setCached(value))
  }, [serverAuth])

  useEffect(() => {
    if (!isRejectedSession(error)) return
    void clearCachedAuth().then(() => setCached(null))
  }, [error])

  const cachedIsValid =
    !!cached &&
    startedAt - new Date(cached.validatedAt).getTime() <=
      OFFLINE_SESSION_MAX_AGE_MS
  const auth = serverAuth ?? (cachedIsValid && !isRejectedSession(error) ? cached.user : null)
  const offlineSession = !!auth && !serverAuth

  useEffect(() => {
    if (!serverAuth) return

    const interval = setInterval(() => {
      refresh().catch((refreshError) => {
        if (isRejectedSession(refreshError)) void endSession()
      })
    }, SESSION_POLL_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [serverAuth, endSession])

  const loading = (isLoading && cached === undefined) || isLoggingOut

  const value = useMemo(
    () => ({ auth, loading, offlineSession, refetch, logout }),
    [auth, loading, offlineSession, refetch, logout]
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export { AuthContext, AuthProvider }
