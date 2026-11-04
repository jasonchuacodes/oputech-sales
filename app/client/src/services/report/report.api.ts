import { requestGraphQL } from '../../lib/graphql'
import {
  Report,
  CreateReportInput,
  ReportsPage,
  ReportsPageParams,
} from './report.types'

const REPORT_FIELDS = `
  id
  createdBy { id username }
  fromDate
  toDate
  products {
    productId
    name
    quantitySold
    pricePerUnit
    printCount
    total
  }
  totalCash
  totalOnline
  totalIncome
  totalExpenses
  totalPrintCount
  expenses {
    id
    label
    total
    paymentType
    createdAt
  }
  isRemitted
  createdAt
`

const GET_REPORTS = `
  query GetReports {
    reports {
      ${REPORT_FIELDS}
    }
  }
`

const GET_REPORT = `
  query GetReport($id: ID!) {
    report(id: $id) {
      ${REPORT_FIELDS}
    }
  }
`

const GET_REPORTS_PAGE = `
  query GetReportsPage(
    $filter: ReportFilterInput
    $pagination: ReportPaginationInput
    $sort: ReportSortOrder
  ) {
    reportsPage(filter: $filter, pagination: $pagination, sort: $sort) {
      items {
        id
        fromDate
        toDate
        createdAt
        isRemitted
        totalCash
        totalOnline
        totalExpenses
        netIncome
      }
      totalCount
      page
      pageSize
      totals {
        totalCash
        totalOnline
        totalExpenses
        netIncome
      }
    }
  }
`

const CREATE_REPORT = `
  mutation CreateReport($input: CreateReportInput!) {
    createReport(input: $input) {
      ${REPORT_FIELDS}
    }
  }
`

export async function getReports(): Promise<Report[]> {
  const data = await requestGraphQL<{ reports: Report[] }>(GET_REPORTS)
  return data.reports
}

export async function getReport(id: string): Promise<Report> {
  const data = await requestGraphQL<{ report: Report }>(GET_REPORT, { id })
  return data.report
}

export async function getReportsPage(params: ReportsPageParams): Promise<ReportsPage> {
  const data = await requestGraphQL<{ reportsPage: ReportsPage }>(GET_REPORTS_PAGE, {
    ...params,
  })
  return data.reportsPage
}

export async function createReport(input: CreateReportInput): Promise<Report> {
  const data = await requestGraphQL<{ createReport: Report }>(CREATE_REPORT, {
    input,
  })
  return data.createReport
}

const DELETE_REPORT = `
  mutation DeleteReport($id: ID!) {
    deleteReport(id: $id)
  }
`

export async function deleteReport(id: string): Promise<boolean> {
  const data = await requestGraphQL<{ deleteReport: boolean }>(DELETE_REPORT, {
    id,
  })
  return data.deleteReport
}

const REMIT = `
  mutation Remit($id: ID!, $isRemitted: Boolean!) {
    remit(id: $id, isRemitted: $isRemitted) {
      ${REPORT_FIELDS}
    }
  }
`

export async function remit(id: string, isRemitted: boolean): Promise<Report> {
  const data = await requestGraphQL<{ remit: Report }>(REMIT, {
    id,
    isRemitted,
  })
  return data.remit
}
