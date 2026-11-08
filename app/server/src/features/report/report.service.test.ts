import { ForbiddenException, InvalidInputException } from '../../common/exceptions'
import { describe, expect, it, vi } from 'vitest'
import {
  AnalyticsRange,
  getAnalyticsDateRange,
  ReportService,
} from './report.service'
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
  TransactionStatus: { ACTIVE: 'ACTIVE', VOIDED: 'VOIDED' },
}))

const queryResult = <T>(value: T) => {
  const query = {
    exec: vi.fn().mockResolvedValue(value),
    session: vi.fn(),
  }
  query.session.mockReturnValue(query)
  return query
}

const makeConnection = () => ({
  startSession: vi.fn().mockResolvedValue({
    withTransaction: vi.fn(async (operation) => operation()),
    endSession: vi.fn(),
  }),
})

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
      { collection: { name: 'transactions' } } as never,
      makeConnection() as never,
    )

    const result = await service.findPage('tenant-1', {
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
        tenantId: 'tenant-1',
        toDate: {
          $gte: new Date('2026-10-31T16:00:00.000Z'),
          $lt: new Date('2026-11-30T16:00:00.000Z'),
        },
      },
    })
    expect(pipeline[1]).toEqual({
      $sort: { toDate: 1, createdAt: 1, _id: 1 },
    })
    const lookup = pipeline.find((stage: any) => stage.$lookup)?.$lookup
    expect(lookup.let).toEqual({
      transactionIds: '$transactionObjectIds',
      tenantId: '$tenantId',
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
    expect(pipeline.find((stage: any) => stage.$set?.totalPrintCount)).toEqual({
      $set: expect.objectContaining({
        totalPrintCount: {
          $sum: {
            $map: {
              input: { $ifNull: ['$products', []] },
              as: 'product',
              in: {
                $multiply: [
                  { $ifNull: ['$$product.printCount', 0] },
                  { $ifNull: ['$$product.quantitySold', 0] },
                ],
              },
            },
          },
        },
      }),
    })
  })

  it('returns zero totals when no reports match', async () => {
    const aggregate = vi.fn().mockReturnValue({
      exec: vi.fn().mockResolvedValue([{ items: [], summary: [] }]),
    })
    const service = new ReportService(
      { aggregate } as never,
      {} as never,
      { collection: { name: 'transactions' } } as never,
      makeConnection() as never,
    )

    await expect(service.findPage('tenant-1', {})).resolves.toEqual({
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
      { collection: { name: 'transactions' } } as never,
      makeConnection() as never,
    )

    await expect(
      service.findPage('tenant-1', {
        filter: {
          dateRange: {
            from: '2026-11-04T00:00:00.000Z',
            to: '2026-11-01T00:00:00.000Z',
          },
        },
      })
    ).rejects.toBeInstanceOf(InvalidInputException)
    expect(aggregate).not.toHaveBeenCalled()
  })
})

describe('ReportService deletion permissions', () => {
  const reportId = '507f1f77bcf86cd799439011'

  it('allows an unremitted report to be deleted without admin access', async () => {
    const report = {
      isRemitted: false,
      transactionIds: [],
      toDate: new Date('2026-11-05T04:00:00.000Z'),
      deleteOne: vi.fn().mockResolvedValue(undefined),
    }
    const reportModel = {
      findOne: vi.fn().mockReturnValue(queryResult(report)),
    }
    const transactionModel = {
      find: vi.fn().mockReturnValue(queryResult([])),
      updateMany: vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue(undefined),
      }),
    }
    const aggregateModel = {
      updateOne: vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue(undefined),
      }),
    }
    const service = new ReportService(
      reportModel as never,
      aggregateModel as never,
      transactionModel as never,
      makeConnection() as never,
    )

    await expect(service.delete('tenant-1', reportId)).resolves.toBe(true)
    expect(report.deleteOne).toHaveBeenCalledOnce()
  })

  it('requires admin access to delete a remitted report', async () => {
    const reportModel = {
      findOne: vi.fn().mockReturnValue(queryResult({ isRemitted: true })),
    }
    const transactionModel = { find: vi.fn() }
    const service = new ReportService(
      reportModel as never,
      {} as never,
      transactionModel as never,
      makeConnection() as never,
    )

    await expect(service.delete('tenant-1', reportId)).rejects.toBeInstanceOf(
      ForbiddenException
    )
    expect(transactionModel.find).not.toHaveBeenCalled()
  })
})

describe('analytics date ranges', () => {
  const reference = new Date('2026-11-05T04:00:00.000Z')

  it.each([
    [
      AnalyticsRange.TODAY,
      '2026-11-04T16:00:00.000Z',
      '2026-11-05T15:59:59.999Z',
    ],
    [
      AnalyticsRange.THIS_WEEK,
      '2026-11-01T16:00:00.000Z',
      '2026-11-05T15:59:59.999Z',
    ],
    [
      AnalyticsRange.THIS_MONTH,
      '2026-10-31T16:00:00.000Z',
      '2026-11-05T15:59:59.999Z',
    ],
    [
      AnalyticsRange.LAST_MONTH,
      '2026-09-30T16:00:00.000Z',
      '2026-10-31T15:59:59.999Z',
    ],
  ])(
    'calculates the %s calendar boundaries',
    (range, expectedStart, expectedEnd) => {
      const result = getAnalyticsDateRange(range, reference)

      expect(result.start.toISOString()).toBe(expectedStart)
      expect(result.end.toISOString()).toBe(expectedEnd)
    }
  )

  it('handles the previous month across a year boundary', () => {
    const result = getAnalyticsDateRange(
      AnalyticsRange.LAST_MONTH,
      new Date('2026-01-15T04:00:00.000Z')
    )

    expect(result.start.toISOString()).toBe('2025-11-30T16:00:00.000Z')
    expect(result.end.toISOString()).toBe('2025-12-31T15:59:59.999Z')
  })
})
