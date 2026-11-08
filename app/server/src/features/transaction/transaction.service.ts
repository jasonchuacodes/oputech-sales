import { Injectable } from '@nestjs/common'
import { InjectConnection, InjectModel } from '@nestjs/mongoose'
import { Connection, QueryFilter, Model } from 'mongoose'
import {
  Transaction,
  TransactionDocument,
  PaymentType,
  TransactionType,
  TransactionStatus,
} from './schemas/transaction.schema'
import { Product, ProductDocument } from '../product/schemas/product.schema'
import { CreateTransactionInput, TransactionFilter } from './transaction.types'
import {
  ConflictException,
  InvalidInputException,
  NotFoundException,
} from '../../common/exceptions'
import { StockService } from '../stock/stock.service'

@Injectable()
export class TransactionService {
  constructor(
    @InjectModel(Transaction.name) private transaction: Model<TransactionDocument>,
    @InjectModel(Product.name) private product: Model<ProductDocument>,
    @InjectConnection() private readonly connection: Connection,
    private readonly stockService: StockService,
  ) {}

  async getTransactions(tenantId: string, filter?: TransactionFilter): Promise<TransactionDocument[]> {
    const query: QueryFilter<TransactionDocument> = {
      tenantId,
      status: { $ne: TransactionStatus.VOIDED },
    }

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

  async createTransaction(
    tenantId: string,
    input: CreateTransactionInput,
    actorId?: string,
  ): Promise<TransactionDocument> {
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

    const session = await this.connection.startSession()
    try {
      let created: TransactionDocument | undefined
      await session.withTransaction(async () => {
        if (input.clientMutationId) {
          const repeated = await this.transaction
            .findOne({ tenantId, clientMutationId: input.clientMutationId })
            .session(session)
            .exec()
          if (repeated) {
            created = repeated
            return
          }
        }

        const ids = items.map((item) => item.productId)
        const products = await this.product
          .find({
            _id: { $in: ids },
            tenantId,
            archivedAt: { $exists: false },
          })
          .session(session)
          .exec()

        for (const { productId } of items) {
          const product = products.find((candidate) => candidate._id.toString() === productId)
          if (!product) {
            throw new NotFoundException(
              'One or more selected products are no longer available.',
              { details: { productId } },
            )
          }
        }

        const transactionItems = items.map(({ productId, quantity }) => {
          const product = products.find((candidate) => candidate._id.toString() === productId)!
          return {
            productId,
            name: product.name,
            price: product.price,
            printCount: product.printCount ?? 0,
            quantity,
          }
        })
        const total = transactionItems.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0,
        )
        const [transaction] = await this.transaction.create(
          [{
            tenantId,
            clientMutationId: input.clientMutationId,
            occurredAt,
            type: TransactionType.SALE,
            items: transactionItems,
            paymentType: input.paymentType,
            total,
            processed: false,
            status: TransactionStatus.ACTIVE,
          }],
          { session },
        )

        const applied = await this.stockService.applySale(
          tenantId,
          transaction._id.toString(),
          occurredAt,
          actorId,
          transactionItems.map((item) => {
            const product = products.find(
              (candidate) => candidate._id.toString() === item.productId,
            )!
            return {
              productId: item.productId,
              productName: item.name,
              quantity: item.quantity,
              tracked: product.stockTrackingEnabled === true,
            }
          }),
          session,
        )

        if (applied.length > 0) {
          const byProduct = new Map(applied.map((entry) => [entry.productId, entry]))
          for (const item of transaction.items) {
            const inventory = byProduct.get(item.productId)
            if (!inventory) continue
            item.inventoryQuantity = inventory.quantity
            item.inventoryUnit = inventory.unit
          }
          transaction.inventoryAppliedAt = new Date()
          transaction.markModified('items')
          await transaction.save({ session })
        }
        created = transaction
      })
      return created!
    } catch (error: any) {
      if (error?.code === 11000 && input.clientMutationId) {
        const existing = await this.transaction
          .findOne({ tenantId, clientMutationId: input.clientMutationId })
          .exec()
        if (existing) return existing
      }
      throw error
    } finally {
      await session.endSession()
    }
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

  async remove(
    tenantId: string,
    id: string,
    actorId?: string,
  ): Promise<TransactionDocument | null> {
    const session = await this.connection.startSession()
    try {
      let result: TransactionDocument | null = null
      await session.withTransaction(async () => {
        const transaction = await this.transaction
          .findOne({ _id: id, tenantId })
          .session(session)
          .exec()
        if (!transaction) return
        if (transaction.status === TransactionStatus.VOIDED) {
          result = transaction
          return
        }
        if (transaction.processed) {
          throw new ConflictException(
            'This transaction cannot be voided because it is already included in a report.',
          )
        }

        if (transaction.inventoryAppliedAt) {
          await this.stockService.reverseSale(
            tenantId,
            transaction._id.toString(),
            actorId,
            session,
          )
        }
        transaction.status = TransactionStatus.VOIDED
        transaction.voidedAt = new Date()
        transaction.voidedBy = actorId
        await transaction.save({ session })
        result = transaction
      })
      return result
    } finally {
      await session.endSession()
    }
  }
}
