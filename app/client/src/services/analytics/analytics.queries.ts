import { useQuery } from '@tanstack/react-query'
import { getAnalytics } from './analytics.api'
import { AnalyticsRange } from './analytics.types'
import { useSyncContext } from '../../context/sync/useSyncContext'

export const useAnalytics = (range: AnalyticsRange) => {
  const { canUseOnlineFeatures } = useSyncContext()
  return useQuery({
    queryKey: ['analytics', range],
    queryFn: () => getAnalytics(range),
    enabled: canUseOnlineFeatures,
  })
}
