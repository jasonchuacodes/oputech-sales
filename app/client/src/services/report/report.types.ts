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
