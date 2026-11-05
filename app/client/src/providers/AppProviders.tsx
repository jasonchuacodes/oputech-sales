'use client'

import { useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/context/auth/AuthContext'
import { SyncProvider } from '@/context/sync/SyncContext'
import { PWAReloadPrompt } from '@/components/PWAReloadPrompt'
import { TenantProvider } from '@/context/tenant/TenantContext'
import { useIsDesktop } from '@/hooks/useIsDesktop'

export const AppProviders = ({ children }: { children: ReactNode }) => {
  const isDesktop = useIsDesktop()
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
        <TenantProvider>
          <SyncProvider>
            {children}
            <PWAReloadPrompt />
            <Toaster position={isDesktop ? 'bottom-right' : 'top-right'} />
          </SyncProvider>
        </TenantProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
