'use client'

import { useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/context/auth/AuthContext'
import { SyncProvider } from '@/context/sync/SyncContext'
import { PWAReloadPrompt } from '@/components/PWAReloadPrompt'

export const AppProviders = ({ children }: { children: ReactNode }) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { refetchOnWindowFocus: false },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SyncProvider>
          {children}
          <PWAReloadPrompt />
          <Toaster position="top-center" />
          <ReactQueryDevtools initialIsOpen={false} />
        </SyncProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
