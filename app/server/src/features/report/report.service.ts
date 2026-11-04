import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { Report, ReportDocument } from './schemas/report.schema'
import { Aggregate, AggregateDocument } from './schemas/aggregate.schema'
import {
  Transaction,
  TransactionDocument,
  PaymentType,
  TransactionType,
} from '../transaction/schemas/transaction.schema'
import { CreateReportInput } from './report.types'
import { dayjsLocal } from '../../common/utils/date'

export enum AnalyticsRange {
  TODAY = 'TODAY',
  LAST_7_DAYS = 'LAST_7_DAYS',
  LAST_15_DAYS = 'LAST_15_DAYS',
  LAST_MONTH = 'LAST_MONTH',
  LAST_6_MONTHS = 'LAST_6_MONTHS',
}

const RANGE_DAYS: Record<AnalyticsRange, number> = {
  [AnalyticsRange.TODAY]: 1,
  [AnalyticsRange.LAST_7_DAYS]: 7,
  [AnalyticsRange.LAST_15_DAYS]: 15,
  [AnalyticsRange.LAST_MONTH]: 30,
  [AnalyticsRange.LAST_6_MONTHS]: 180,
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
  ) {}

  async create(input: CreateReportInput, userId: string): Promise<ReportDocument> {
    const from = new Date(input.fromDate)
    const to = new Date(input.toDate)

    const transactions = await this.transactionModel
      .find({
        processed: { $ne: true },
        $or: [
          { occurredAt: { $gte: from, $lte: to } },
          {
            occurredAt: { $exists: false },
            createdAt: { $gte: from, $lte: to },
          },
        ],
      })
      .exec()

    const ids = transactions.map((t) => t._id.toString())

    const productMap = new Map<
      string,
      { name: string; pricePerUnit: number; printCount: number; quantitySold: number }
    >()
    for (const tx of transactions) {
      for (const item of tx.items) {
        const existing = productMap.get(item.productId)
        if (existing) {
          existing.quantitySold += item.quantity
        } else {
          productMap.set(item.productId, {
            name: item.name,
            pricePerUnit: item.price,
            printCount: item.printCount,
            quantitySold: item.quantity,
          })
        }
      }
    }

    const products = Array.from(productMap.entries()).map(([productId, v]) => ({
      productId,
      ...v,
    }))

    await this.transactionModel.updateMany({ _id: { $in: ids } }, { processed: true }).exec()

    const totalSales = transactions
      .filter((t) => t.type === TransactionType.SALE)
      .reduce((sum, t) => sum + t.total, 0)
    const totalExpenses = transactions
      .filter((t) => t.type === TransactionType.EXPENSE)
      .reduce((sum, t) => sum + t.total, 0)
    await this.aggregate(this.startOfDay(to), totalSales, totalExpenses)

    return this.reportModel.create({
      createdBy: userId,
      fromDate: from,
      toDate: to,
      transactionIds: ids,
      products,
    })
  }

  async delete(reportId: string): Promise<boolean> {
    const report = await this.reportModel.findById(reportId).exec()
    if (!report) throw new NotFoundException('Report not found')

    const transactions = await this.transactionModel
      .find({ _id: { $in: report.transactionIds } })
      .exec()
    const totalSales = transactions
      .filter((t) => t.type === TransactionType.SALE)
      .reduce((sum, t) => sum + t.total, 0)
    const totalExpenses = await this.getExpenseTotalFromTransactions(report.transactionIds)

    await this.deaggregate(this.startOfDay(report.toDate), totalSales, totalExpenses)
    await this.transactionModel
      .updateMany({ _id: { $in: report.transactionIds } }, { processed: false })
      .exec()
    await report.deleteOne()

    return true
  }

  async remit(reportId: string, isRemitted: boolean): Promise<ReportDocument> {
    const report = await this.reportModel
      .findByIdAndUpdate(reportId, { isRemitted }, { new: true })
      .exec()
    if (!report) throw new NotFoundException('Report not found')
    return report
  }

  async getTotalByPaymentType(transactionIds: string[], paymentType: PaymentType): Promise<number> {
    const transactions = await this.transactionModel
      .find({ _id: { $in: transactionIds }, paymentType, type: TransactionType.SALE })
      .exec()
    return transactions.reduce((sum, t) => sum + t.total, 0)
  }

  async getExpenseTotalFromTransactions(transactionIds: string[]): Promise<number> {
    const transactions = await this.transactionModel
      .find({ _id: { $in: transactionIds }, type: TransactionType.EXPENSE })
      .exec()
    return transactions.reduce((sum, t) => sum + t.total, 0)
  }

  getExpenseTransactions(transactionIds: string[]): Promise<TransactionDocument[]> {
    return this.transactionModel
      .find({ _id: { $in: transactionIds }, type: TransactionType.EXPENSE })
      .sort({ createdAt: 1 })
      .exec()
  }

  findAll(): Promise<ReportDocument[]> {
    return this.reportModel.find().sort({ createdAt: -1 }).exec()
  }

  findById(id: string): Promise<ReportDocument | null> {
    return this.reportModel.findById(id).exec()
  }

  async getAnalytics(range: AnalyticsRange) {
    const now = new Date()
    const end = this.endOfDay(now)
    const start = dayjsLocal(now)
      .startOf('day')
      .subtract(RANGE_DAYS[range] - 1, 'day')
      .toDate()

    const aggregates = await this.aggregateModel
      .find({ date: { $gte: start, $lte: end } })
      .sort({ date: 1 })
      .exec()

    let series: AnalyticsPoint[] = aggregates.map((a) => ({
      date: a.date.toISOString(),
      totalSales: a.totalSales,
      totalExpenses: a.totalExpenses,
    }))

    if (range === AnalyticsRange.LAST_6_MONTHS) {
      series = this.bucketWeekly(aggregates)
    }

    const topProducts = await this.getTopProducts(start, end)

    return {
      series,
      topProducts,
      totalSales: series.reduce((sum, p) => sum + p.totalSales, 0),
      totalExpenses: series.reduce((sum, p) => sum + p.totalExpenses, 0),
    }
  }

  private async getTopProducts(start: Date, end: Date): Promise<TopProduct[]> {
    const rows = await this.reportModel.aggregate([
      { $match: { toDate: { $gte: start, $lte: end } } },
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

  private bucketWeekly(aggregates: AggregateDocument[]): AnalyticsPoint[] {
    const buckets = new Map<string, AnalyticsPoint>()
    for (const a of aggregates) {
      const weekStart = this.startOfWeek(a.date)
      const key = weekStart.toISOString()
      const existing = buckets.get(key)
      if (existing) {
        existing.totalSales += a.totalSales
        existing.totalExpenses += a.totalExpenses
      } else {
        buckets.set(key, {
          date: key,
          totalSales: a.totalSales,
          totalExpenses: a.totalExpenses,
        })
      }
    }
    return Array.from(buckets.values())
  }

  private async aggregate(date: Date, sales: number, expenses: number): Promise<void> {
    await this.aggregateModel
      .updateOne(
        { date },
        { $inc: { totalSales: sales, totalExpenses: expenses }, $setOnInsert: { date } },
        { upsert: true },
      )
      .exec()
  }

  private async deaggregate(date: Date, sales: number, expenses: number): Promise<void> {
    await this.aggregate(date, -sales, -expenses)
  }

  // Truncate to APP_TZ midnight. Sales are attributed to the report's toDate day.
  private startOfDay(d: Date): Date {
    return dayjsLocal(d).startOf('day').toDate()
  }

  // End of the APP_TZ day containing d (23:59:59.999 local).
  private endOfDay(d: Date): Date {
    return dayjsLocal(d).endOf('day').toDate()
  }

  // Monday-anchored start of the week containing d (APP_TZ).
  private startOfWeek(d: Date): Date {
    const day = dayjsLocal(d).startOf('day')
    const offset = (day.day() + 6) % 7
    return day.subtract(offset, 'day').toDate()
  }
}
