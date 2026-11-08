import { Injectable } from '@nestjs/common'
import { InjectConnection, InjectModel } from '@nestjs/mongoose'
import {
  ClientSession,
  Connection,
  isValidObjectId,
  Model,
  PipelineStage,
} from 'mongoose'
import { Report, ReportDocument } from './schemas/report.schema'
import { Aggregate, AggregateDocument } from './schemas/aggregate.schema'
import {
  Transaction,
  TransactionDocument,
  PaymentType,
  TransactionType,
  TransactionStatus,
} from '../transaction/schemas/transaction.schema'
import {
  CreateReportInput,
  ReportsPageQuery,
  ReportsPageResult,
  ReportSortOrder,
} from './report.types'
import { dayjsLocal } from '../../common/utils/date'
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InvalidInputException,
  NotFoundException,
} from '../../common/exceptions'

export enum AnalyticsRange {
  TODAY = 'TODAY',
  THIS_WEEK = 'THIS_WEEK',
  THIS_MONTH = 'THIS_MONTH',
  LAST_MONTH = 'LAST_MONTH',
}

interface AnalyticsDateRange {
  start: Date
  end: Date
}

export const getAnalyticsDateRange = (
  range: AnalyticsRange,
  reference: Date = new Date()
): AnalyticsDateRange => {
  const today = dayjsLocal(reference).startOf('day')

  if (range === AnalyticsRange.THIS_WEEK) {
    const daysSinceMonday = (today.day() + 6) % 7
    return {
      start: today.subtract(daysSinceMonday, 'day').toDate(),
      end: today.endOf('day').toDate(),
    }
  }

  if (range === AnalyticsRange.THIS_MONTH) {
    return {
      start: today.startOf('month').toDate(),
      end: today.endOf('day').toDate(),
    }
  }

  if (range === AnalyticsRange.LAST_MONTH) {
    const previousMonth = today.subtract(1, 'month')
    return {
      start: previousMonth.startOf('month').toDate(),
      end: previousMonth.endOf('month').toDate(),
    }
  }

  return {
    start: today.toDate(),
    end: today.endOf('day').toDate(),
  }
}

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

@Injectable()
export class ReportService {
  constructor(
    @InjectModel(Report.name) private reportModel: Model<ReportDocument>,
    @InjectModel(Aggregate.name) private aggregateModel: Model<AggregateDocument>,
    @InjectModel(Transaction.name) private transactionModel: Model<TransactionDocument>,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  async create(tenantId: string, input: CreateReportInput, userId: string): Promise<ReportDocument> {
    const from = new Date(input.fromDate)
    const to = new Date(input.toDate)
    const session = await this.connection.startSession()
    try {
      let result: ReportDocument | undefined
      await session.withTransaction(async () => {
        const transactions = await this.transactionModel
          .find({
            tenantId,
            processed: { $ne: true },
            status: { $ne: TransactionStatus.VOIDED },
            $or: [
              { occurredAt: { $gte: from, $lte: to } },
              {
                occurredAt: { $exists: false },
                createdAt: { $gte: from, $lte: to },
              },
            ],
          })
          .session(session)
          .exec()

        const ids = transactions.map((transaction) => transaction._id.toString())
        const productMap = new Map<
          string,
          { name: string; pricePerUnit: number; printCount: number; quantitySold: number }
        >()
        for (const transaction of transactions) {
          for (const item of transaction.items) {
            const existing = productMap.get(item.productId)
            if (existing) existing.quantitySold += item.quantity
            else {
              productMap.set(item.productId, {
                name: item.name,
                pricePerUnit: item.price,
                printCount: item.printCount,
                quantitySold: item.quantity,
              })
            }
          }
        }
        const products = Array.from(productMap.entries()).map(([productId, value]) => ({
          productId,
          ...value,
        }))

        const claimed = await this.transactionModel
          .updateMany(
            {
              _id: { $in: ids },
              tenantId,
              processed: { $ne: true },
              status: { $ne: TransactionStatus.VOIDED },
            },
            { processed: true },
            { session },
          )
          .exec()
        if (claimed.matchedCount !== ids.length) {
          throw new ConflictException(
            'Transactions changed while the report was being created. Please try again.',
          )
        }

        const totalSales = transactions
          .filter((transaction) => transaction.type === TransactionType.SALE)
          .reduce((sum, transaction) => sum + transaction.total, 0)
        const totalExpenses = transactions
          .filter((transaction) => transaction.type === TransactionType.EXPENSE)
          .reduce((sum, transaction) => sum + transaction.total, 0)
        await this.aggregate(
          tenantId,
          this.startOfDay(to),
          totalSales,
          totalExpenses,
          session,
        )

        const [report] = await this.reportModel.create(
          [{
            tenantId,
            createdBy: userId,
            fromDate: from,
            toDate: to,
            transactionIds: ids,
            products,
          }],
          { session },
        )
        result = report
      })
      return result!
    } finally {
      await session.endSession()
    }
  }

  async delete(
    tenantId: string,
    reportId: string,
    canDeleteRemitted = false,
  ): Promise<boolean> {
    this.assertValidReportId(reportId)
    const session = await this.connection.startSession()
    try {
      await session.withTransaction(async () => {
        const report = await this.reportModel
          .findOne({ _id: reportId, tenantId })
          .session(session)
          .exec()
        if (!report) throw new NotFoundException('The requested report was not found.')
        if (report.isRemitted && !canDeleteRemitted) {
          throw new ForbiddenException(
            'Administrator access is required to delete a remitted report.',
          )
        }

        const transactions = await this.transactionModel
          .find({ _id: { $in: report.transactionIds }, tenantId })
          .session(session)
          .exec()
        const totalSales = transactions
          .filter((transaction) => transaction.type === TransactionType.SALE)
          .reduce((sum, transaction) => sum + transaction.total, 0)
        const totalExpenses = transactions
          .filter((transaction) => transaction.type === TransactionType.EXPENSE)
          .reduce((sum, transaction) => sum + transaction.total, 0)

        await this.deaggregate(
          tenantId,
          this.startOfDay(report.toDate),
          totalSales,
          totalExpenses,
          session,
        )
        await this.transactionModel
          .updateMany(
            { _id: { $in: report.transactionIds }, tenantId },
            { processed: false },
            { session },
          )
          .exec()
        await report.deleteOne({ session })
      })
      return true
    } finally {
      await session.endSession()
    }
  }

  async remit(tenantId: string, reportId: string, isRemitted: boolean): Promise<ReportDocument> {
    this.assertValidReportId(reportId)
    const report = await this.reportModel
      .findOneAndUpdate({ _id: reportId, tenantId }, { isRemitted }, { new: true })
      .exec()
    if (!report) {
      throw new NotFoundException(
        'The requested report was not found.',
      )
    }
    return report
  }

  async getTotalByPaymentType(tenantId: string, transactionIds: string[], paymentType: PaymentType): Promise<number> {
    const transactions = await this.transactionModel
      .find({ _id: { $in: transactionIds }, tenantId, paymentType, type: TransactionType.SALE })
      .exec()
    return transactions.reduce((sum, t) => sum + t.total, 0)
  }

  async getExpenseTotalFromTransactions(tenantId: string, transactionIds: string[]): Promise<number> {
    const transactions = await this.transactionModel
      .find({ _id: { $in: transactionIds }, tenantId, type: TransactionType.EXPENSE })
      .exec()
    return transactions.reduce((sum, t) => sum + t.total, 0)
  }

  getExpenseTransactions(tenantId: string, transactionIds: string[]): Promise<TransactionDocument[]> {
    return this.transactionModel
      .find({ _id: { $in: transactionIds }, tenantId, type: TransactionType.EXPENSE })
      .sort({ createdAt: 1 })
      .exec()
  }

  findAll(tenantId: string): Promise<ReportDocument[]> {
    return this.reportModel.find({ tenantId }).sort({ createdAt: -1 }).exec()
  }

  async findPage(tenantId: string, query: ReportsPageQuery): Promise<ReportsPageResult> {
    const page = query.pagination?.page ?? 1
    const pageSize = query.pagination?.pageSize ?? 10
    const sortOrder = query.sort ?? ReportSortOrder.DATE_DESC
    const dateRange = query.filter?.dateRange
    const match: Record<string, unknown> = { tenantId }

    if (dateRange) {
      const from = new Date(dateRange.from)
      const to = new Date(dateRange.to)
      if (from >= to) {
        throw new InvalidInputException(
          'The report end date must be after its start date.',
        )
      }
      match.toDate = { $gte: from, $lt: to }
    }

    const direction: 1 | -1 = sortOrder === ReportSortOrder.DATE_ASC ? 1 : -1
    const sort: Record<string, 1 | -1> = {
      toDate: direction,
      createdAt: direction,
      _id: direction,
    }

    const pipeline: PipelineStage[] = [
      { $match: match },
      { $sort: sort },
      {
        $project: {
          tenantId: 1,
          fromDate: 1,
          toDate: 1,
          createdAt: 1,
          isRemitted: 1,
          products: 1,
          transactionIds: 1,
        },
      },
      {
        $set: {
          transactionObjectIds: {
            $setUnion: [
              {
                $filter: {
                  input: {
                    $map: {
                      input: { $ifNull: ['$transactionIds', []] },
                      as: 'transactionId',
                      in: {
                        $convert: {
                          input: '$$transactionId',
                          to: 'objectId',
                          onError: null,
                          onNull: null,
                        },
                      },
                    },
                  },
                  as: 'transactionId',
                  cond: { $ne: ['$$transactionId', null] },
                },
              },
              [],
            ],
          },
        },
      },
      {
        $lookup: {
          from: this.transactionModel.collection.name,
          let: { transactionIds: '$transactionObjectIds', tenantId: '$tenantId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ['$_id', '$$transactionIds'] },
                    { $eq: ['$tenantId', '$$tenantId'] },
                  ],
                },
              },
            },
            {
              $group: {
                _id: null,
                totalCash: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $eq: ['$type', TransactionType.SALE] },
                          { $eq: ['$paymentType', PaymentType.CASH] },
                        ],
                      },
                      '$total',
                      0,
                    ],
                  },
                },
                totalOnline: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $eq: ['$type', TransactionType.SALE] },
                          { $eq: ['$paymentType', PaymentType.ONLINE] },
                        ],
                      },
                      '$total',
                      0,
                    ],
                  },
                },
                totalExpenses: {
                  $sum: {
                    $cond: [{ $eq: ['$type', TransactionType.EXPENSE] }, '$total', 0],
                  },
                },
              },
            },
          ],
          as: 'financial',
        },
      },
      {
        $set: {
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
          totalCash: { $ifNull: [{ $arrayElemAt: ['$financial.totalCash', 0] }, 0] },
          totalOnline: { $ifNull: [{ $arrayElemAt: ['$financial.totalOnline', 0] }, 0] },
          totalExpenses: {
            $ifNull: [{ $arrayElemAt: ['$financial.totalExpenses', 0] }, 0],
          },
        },
      },
      {
        $set: {
          netIncome: {
            $subtract: [{ $add: ['$totalCash', '$totalOnline'] }, '$totalExpenses'],
          },
        },
      },
      {
        $facet: {
          items: [
            { $skip: (page - 1) * pageSize },
            { $limit: pageSize },
            {
              $project: {
                _id: 0,
                id: { $toString: '$_id' },
                fromDate: { $toString: '$fromDate' },
                toDate: { $toString: '$toDate' },
                createdAt: { $toString: '$createdAt' },
                isRemitted: 1,
                totalPrintCount: 1,
                totalCash: 1,
                totalOnline: 1,
                totalExpenses: 1,
                netIncome: 1,
              },
            },
          ],
          summary: [
            {
              $group: {
                _id: null,
                totalCount: { $sum: 1 },
                totalCash: { $sum: '$totalCash' },
                totalOnline: { $sum: '$totalOnline' },
                totalExpenses: { $sum: '$totalExpenses' },
                netIncome: { $sum: '$netIncome' },
              },
            },
          ],
        },
      },
    ]

    const [result] = await this.reportModel.aggregate(pipeline).exec()
    const summary = result?.summary?.[0]

    return {
      items: result?.items ?? [],
      totalCount: summary?.totalCount ?? 0,
      page,
      pageSize,
      totals: {
        totalCash: summary?.totalCash ?? 0,
        totalOnline: summary?.totalOnline ?? 0,
        totalExpenses: summary?.totalExpenses ?? 0,
        netIncome: summary?.netIncome ?? 0,
      },
    }
  }

  findById(tenantId: string, id: string): Promise<ReportDocument | null> {
    this.assertValidReportId(id)
    return this.reportModel.findOne({ _id: id, tenantId }).exec()
  }

  async getAnalytics(tenantId: string, range: AnalyticsRange) {
    const { start, end } = getAnalyticsDateRange(range)

    const aggregates = await this.aggregateModel
      .find({ tenantId, date: { $gte: start, $lte: end } })
      .sort({ date: 1 })
      .exec()

    const series: AnalyticsPoint[] = aggregates.map((a) => ({
      date: a.date.toISOString(),
      totalSales: a.totalSales,
      totalExpenses: a.totalExpenses,
    }))

    const topProducts = await this.getTopProducts(tenantId, start, end)

    return {
      series,
      topProducts,
      totalSales: series.reduce((sum, p) => sum + p.totalSales, 0),
      totalExpenses: series.reduce((sum, p) => sum + p.totalExpenses, 0),
    }
  }

  private async getTopProducts(tenantId: string, start: Date, end: Date): Promise<TopProduct[]> {
    const rows = await this.reportModel.aggregate([
      { $match: { tenantId, toDate: { $gte: start, $lte: end } } },
      { $unwind: '$products' },
      {
        $group: {
          _id: '$products.productId',
          name: { $first: '$products.name' },
          quantitySold: { $sum: '$products.quantitySold' },
        },
      },
      { $sort: { quantitySold: -1 } },
      { $limit: 10 },
    ])
    return rows.map((r) => ({ productId: r._id, name: r.name, quantitySold: r.quantitySold }))
  }

  private async aggregate(
    tenantId: string,
    date: Date,
    sales: number,
    expenses: number,
    session?: ClientSession,
  ): Promise<void> {
    await this.aggregateModel
      .updateOne(
        { tenantId, date },
        {
          $inc: { totalSales: sales, totalExpenses: expenses },
          $setOnInsert: { tenantId, date },
        },
        { upsert: true, session },
      )
      .exec()
  }

  private async deaggregate(
    tenantId: string,
    date: Date,
    sales: number,
    expenses: number,
    session?: ClientSession,
  ): Promise<void> {
    await this.aggregate(tenantId, date, -sales, -expenses, session)
  }

  private assertValidReportId(id: string): void {
    if (!isValidObjectId(id)) {
      throw new BadRequestException(
        'The report ID is invalid.',
      )
    }
  }

  // Truncate to APP_TZ midnight. Sales are attributed to the report's toDate day.
  private startOfDay(d: Date): Date {
    return dayjsLocal(d).startOf('day').toDate()
  }
}
