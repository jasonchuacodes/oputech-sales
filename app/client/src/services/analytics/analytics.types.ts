export type AnalyticsRange =
  | 'TODAY'
  | 'LAST_7_DAYS'
  | 'LAST_15_DAYS'
  | 'LAST_MONTH'
  | 'LAST_6_MONTHS'

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
