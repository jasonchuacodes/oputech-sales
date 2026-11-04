import { useContext } from 'react'
import { TenantContext } from './TenantContext'

export const useTenantContext = () => {
  const context = useContext(TenantContext)
  if (!context) throw new Error('useTenantContext must be used within TenantProvider')
  return context
}
