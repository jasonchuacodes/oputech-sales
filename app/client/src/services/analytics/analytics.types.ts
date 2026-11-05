export type AnalyticsRange = 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'LAST_MONTH'

export interface AnalyticsPoint {
  date: string
  totalSales: number
  totalExpenses: number
}

export interface TopProduct {
  productId: string
  name: string
  quantitySold: number
}

export interface Analytics {
  series: AnalyticsPoint[]
  topProducts: TopProduct[]
  totalSales: number
  totalExpenses: number
}
