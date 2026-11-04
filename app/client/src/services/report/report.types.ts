import { PaymentType } from '../transaction/transaction.types'

export interface ProductSale {
  productId: string
  name: string
  quantitySold: number
  pricePerUnit: number
  printCount: number
  total: number
}

export interface ReportUser {
  id: string
  username: string
}

export interface ReportExpense {
  id: string
  label?: string
  total: number
  paymentType: PaymentType
  createdAt: string
}

export interface Report {
  id: string
  createdBy: ReportUser
  fromDate: string
  toDate: string
  products: ProductSale[]
  totalCash: number
  totalOnline: number
  totalIncome: number
  totalExpenses: number
  totalPrintCount: number
  expenses: ReportExpense[]
  isRemitted: boolean
  createdAt: string
}

export interface CreateReportInput {
  fromDate: string
  toDate: string
}

export type ReportSortOrder = 'DATE_DESC' | 'DATE_ASC'

export interface ReportDateRangeInput {
  from: string
  to: string
}

export interface ReportsPageParams {
  filter?: {
    dateRange?: ReportDateRangeInput
  }
  pagination: {
    page: number
    pageSize: number
  }
  sort: ReportSortOrder
}

export interface ReportListItem {
  id: string
  fromDate: string
  toDate: string
  createdAt: string
  isRemitted: boolean
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

export interface ReportsPage {
  items: ReportListItem[]
  totalCount: number
  page: number
  pageSize: number
  totals: ReportTotals
}

export type ReportDeleteTarget = Pick<Report, 'id' | 'fromDate' | 'toDate'>
