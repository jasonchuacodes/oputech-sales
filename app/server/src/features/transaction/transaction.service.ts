import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { QueryFilter, Model } from 'mongoose'
import {
  Transaction,
  TransactionDocument,
  PaymentType,
  TransactionType,
} from './schemas/transaction.schema'
import { Product, ProductDocument } from '../product/schemas/product.schema'
import { CreateTransactionInput, TransactionFilter } from './transaction.types'
import {
  ConflictException,
  InvalidInputException,
  NotFoundException,
} from '../../common/exceptions'

@Injectable()
export class TransactionService {
  constructor(
    @InjectModel(Transaction.name) private transaction: Model<TransactionDocument>,
    @InjectModel(Product.name) private product: Model<ProductDocument>,
  ) {}

  async getTransactions(tenantId: string, filter?: TransactionFilter): Promise<TransactionDocument[]> {
    const query: QueryFilter<TransactionDocument> = { tenantId }

    if (filter?.from || filter?.to) {
      const range = {
        ...(filter.from && { $gte: new Date(filter.from) }),
        ...(filter.to && { $lte: new Date(filter.to) }),
      }
      query.$or = [
        { occurredAt: range },
        { occurredAt: { $exists: false }, createdAt: range },
      ]
    }

    if (filter?.processed !== undefined) query.processed = filter.processed

    return this.transaction.find(query).sort({ createdAt: -1 }).exec()
  }

  async createTransaction(tenantId: string, input: CreateTransactionInput): Promise<TransactionDocument> {
    if (input.clientMutationId) {
      const existing = await this.transaction.findOne({
        tenantId,
        clientMutationId: input.clientMutationId,
      }).exec()
      if (existing) return existing
    }

    const occurredAt = input.occurredAt ? new Date(input.occurredAt) : new Date()
    if (Number.isNaN(occurredAt.getTime())) {
      throw new InvalidInputException(
        'The transaction occurrence date is invalid.',
      )
    }

    if (input.type === TransactionType.EXPENSE) {
      if (!input.label?.trim()) {
        throw new InvalidInputException(
          'An expense label is required.',
        )
      }
      if (!input.amount || input.amount <= 0) {
        throw new InvalidInputException(
          'The expense amount must be greater than zero.',
        )
      }

      return this.createIdempotently(tenantId, input.clientMutationId, {
        tenantId,
        clientMutationId: input.clientMutationId,
        occurredAt,
        type: TransactionType.EXPENSE,
        label: input.label,
        items: [],
        paymentType: input.paymentType,
        total: input.amount,
        processed: false,
      })
    }

    const items = input.items ?? []
    if (items.length === 0) {
      throw new InvalidInputException(
        'At least one transaction item is required.',
      )
    }
    for (const item of items) {
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new InvalidInputException(
          'Transaction quantities must be positive whole numbers.',
        )
      }
    }

    const ids = items.map((i) => i.productId)
    const products = await this.product.find({ _id: { $in: ids }, tenantId }).exec()

    for (const { productId } of items) {
      const item = products.find((p) => p._id.toString() === productId)
      if (!item) {
        throw new NotFoundException(
          'One or more selected products are no longer available.',
          { details: { productId } },
        )
      }
    }

    const transactionItems = items.map(({ productId, quantity }) => {
      const item = products.find((p) => p._id.toString() === productId)!
      return {
        productId,
        name: item.name,
        price: item.price,
        printCount: item.printCount ?? 0,
        quantity,
      }
    })

    const total = transactionItems.reduce((sum, i) => sum + i.price * i.quantity, 0)

    return this.createIdempotently(tenantId, input.clientMutationId, {
      tenantId,
      clientMutationId: input.clientMutationId,
      occurredAt,
      type: TransactionType.SALE,
      items: transactionItems,
      paymentType: input.paymentType,
      total,
      processed: false,
    })
  }

  private async createIdempotently(
    tenantId: string,
    clientMutationId: string | undefined,
    data: Record<string, unknown>,
  ): Promise<TransactionDocument> {
    try {
      return await this.transaction.create(data)
    } catch (error: any) {
      if (error?.code === 11000 && clientMutationId) {
        const existing = await this.transaction.findOne({ tenantId, clientMutationId }).exec()
        if (existing) return existing
      }
      throw error
    }
  }

  async remove(tenantId: string, id: string): Promise<TransactionDocument | null> {
    const transaction = await this.transaction.findOne({ _id: id, tenantId }).exec()
    if (!transaction) return null

    if (transaction.processed) {
      throw new ConflictException(
        'This transaction cannot be deleted because it is already included in a report.',
      )
    }

    await transaction.deleteOne()
    return transaction
  }
}
