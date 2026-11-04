import { beforeEach, describe, expect, it, vi } from 'vitest'
import { requestGraphQL } from '../../lib/graphql'
import { getReportsPage } from './report.api'
import type { ReportsPage, ReportsPageParams } from './report.types'

vi.mock('../../lib/graphql', () => ({
  requestGraphQL: vi.fn(),
}))

describe('reports page API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sends the date range under filter and requests lightweight list totals', async () => {
    const params: ReportsPageParams = {
      filter: {
        dateRange: {
          from: '2026-10-31T16:00:00.000Z',
          to: '2026-11-30T16:00:00.000Z',
        },
      },
      pagination: { page: 2, pageSize: 10 },
      sort: 'DATE_DESC',
    }
    const page: ReportsPage = {
      items: [],
      totalCount: 0,
      page: 2,
      pageSize: 10,
      totals: {
        totalCash: 0,
        totalOnline: 0,
        totalExpenses: 0,
        netIncome: 0,
      },
    }
    vi.mocked(requestGraphQL).mockResolvedValue({ reportsPage: page })

    await expect(getReportsPage(params)).resolves.toBe(page)

    const [query, variables] = vi.mocked(requestGraphQL).mock.calls[0]
    expect(query).toContain('reportsPage(filter: $filter, pagination: $pagination, sort: $sort)')
    expect(query).toContain('netIncome')
    expect(query).not.toContain('totalIncome')
    expect(variables).toEqual(params)
    expect(variables).not.toHaveProperty('from')
    expect(variables).not.toHaveProperty('to')
  })
})
