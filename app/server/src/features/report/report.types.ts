export interface CreateReportInput {
  fromDate: string
  toDate: string
}

export enum ReportSortOrder {
  DATE_DESC = 'DATE_DESC',
  DATE_ASC = 'DATE_ASC',
}

export interface ReportsPageQuery {
  filter?: {
    dateRange?: {
      from: string
      to: string
    }
  }
  pagination?: {
    page?: number
    pageSize?: number
  }
  sort?: ReportSortOrder
}

export interface ReportListItem {
  id: string
  fromDate: string
  toDate: string
  createdAt: string
  isRemitted: boolean
  totalPrintCount: number
  totalCash: number
  totalOnline: number
  totalExpenses: number
  netIncome: number
}

export interface ReportTotals {
  totalCash: number
  totalOnline: number
  totalExpenses: number
  netIncome: number
}

export interface ReportsPageResult {
  items: ReportListItem[]
  totalCount: number
  page: number
  pageSize: number
  totals: ReportTotals
}
