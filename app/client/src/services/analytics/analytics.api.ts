import { requestGraphQL } from '../../lib/graphql'
import { Analytics, AnalyticsRange } from './analytics.types'

const GET_ANALYTICS = `
  query GetAnalytics($range: AnalyticsRange!) {
    analytics(range: $range) {
      series {
        date
        totalSales
        totalExpenses
      }
      topProducts {
        productId
        name
        quantitySold
      }
      totalSales
      totalExpenses
    }
  }
`

export async function getAnalytics(range: AnalyticsRange): Promise<Analytics> {
  const data = await requestGraphQL<{ analytics: Analytics }>(GET_ANALYTICS, {
    range,
  })
  return data.analytics
}
