import { useQuery } from '@tanstack/react-query'
import { getAnalytics } from './analytics.api'
import { AnalyticsRange } from './analytics.types'
import { useTenantContext } from '../../context/tenant/useTenantContext'

export const useAnalytics = (range: AnalyticsRange) => {
  const { currentTenant } = useTenantContext()
  const tenantId = currentTenant?.id
  return useQuery({
    queryKey: ['analytics', tenantId, range],
    queryFn: () => getAnalytics(range, tenantId),
    enabled: !!tenantId,
    staleTime: 60 * 1000,
  })
}
