import { BadRequestException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { ReportService } from './report.service'
import { ReportSortOrder } from './report.types'

vi.mock('./schemas/report.schema', () => ({
  Report: class Report {},
}))

vi.mock('./schemas/aggregate.schema', () => ({
  Aggregate: class Aggregate {},
}))

vi.mock('../transaction/schemas/transaction.schema', () => ({
  Transaction: class Transaction {},
  PaymentType: { CASH: 'CASH', ONLINE: 'ONLINE' },
  TransactionType: { SALE: 'SALE', EXPENSE: 'EXPENSE' },
}))

describe('ReportService paginated listing', () => {
  it('returns the selected page and totals for every matching report', async () => {
    const exec = vi.fn().mockResolvedValue([
      {
        items: [
          {
            id: 'report-2',
            totalCash: 100,
            totalOnline: 70,
            totalExpenses: 70,
            netIncome: 100,
          },
        ],
        summary: [
          {
            totalCount: 12,
            totalCash: 500,
            totalOnline: 300,
            totalExpenses: 200,
            netIncome: 600,
          },
        ],
      },
    ])
    const aggregate = vi.fn().mockReturnValue({ exec })
    const service = new ReportService(
      { aggregate } as never,
      {} as never,
      { collection: { name: 'transactions' } } as never
    )

    const result = await service.findPage({
      filter: {
        dateRange: {
          from: '2026-10-31T16:00:00.000Z',
          to: '2026-11-30T16:00:00.000Z',
        },
      },
      pagination: { page: 2, pageSize: 10 },
      sort: ReportSortOrder.DATE_ASC,
    })

    expect(result).toEqual({
      items: expect.any(Array),
      totalCount: 12,
      page: 2,
      pageSize: 10,
      totals: {
        totalCash: 500,
        totalOnline: 300,
        totalExpenses: 200,
        netIncome: 600,
      },
    })

    const pipeline = aggregate.mock.calls[0][0]
    expect(pipeline[0]).toEqual({
      $match: {
        toDate: {
          $gte: new Date('2026-10-31T16:00:00.000Z'),
          $lt: new Date('2026-11-30T16:00:00.000Z'),
        },
      },
    })
    expect(pipeline[1]).toEqual({
      $sort: { toDate: 1, createdAt: 1, _id: 1 },
    })
    expect(pipeline.at(-1).$facet.items.slice(0, 2)).toEqual([
      { $skip: 10 },
      { $limit: 10 },
    ])
    expect(pipeline.find((stage: any) => stage.$set?.netIncome)).toEqual({
      $set: {
        netIncome: {
          $subtract: [{ $add: ['$totalCash', '$totalOnline'] }, '$totalExpenses'],
        },
      },
    })
  })

  it('returns zero totals when no reports match', async () => {
    const aggregate = vi.fn().mockReturnValue({
      exec: vi.fn().mockResolvedValue([{ items: [], summary: [] }]),
    })
    const service = new ReportService(
      { aggregate } as never,
      {} as never,
      { collection: { name: 'transactions' } } as never
    )

    await expect(service.findPage({})).resolves.toEqual({
      items: [],
      totalCount: 0,
      page: 1,
      pageSize: 10,
      totals: {
        totalCash: 0,
        totalOnline: 0,
        totalExpenses: 0,
        netIncome: 0,
      },
    })
  })

  it('rejects a reversed date range before querying MongoDB', async () => {
    const aggregate = vi.fn()
    const service = new ReportService(
      { aggregate } as never,
      {} as never,
      { collection: { name: 'transactions' } } as never
    )

    await expect(
      service.findPage({
        filter: {
          dateRange: {
            from: '2026-11-04T00:00:00.000Z',
            to: '2026-11-01T00:00:00.000Z',
          },
        },
      })
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(aggregate).not.toHaveBeenCalled()
  })
})
