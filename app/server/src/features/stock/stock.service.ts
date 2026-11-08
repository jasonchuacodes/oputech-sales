import { Injectable } from '@nestjs/common'
import { InjectConnection, InjectModel } from '@nestjs/mongoose'
import {
  ClientSession,
  Connection,
  isValidObjectId,
  Model,
  QueryFilter,
  Types,
} from 'mongoose'
import Decimal from 'decimal.js'
import {
  ConflictException,
  InvalidInputException,
  NotFoundException,
} from '../../common/exceptions'
import { Product, ProductDocument } from '../product/schemas/product.schema'
import { Stock, StockDocument, StockUnit } from './schemas/stock.schema'
import {
  StockMovement,
  StockMovementDocument,
  StockMovementReason,
  StockMovementSourceType,
} from './schemas/stock-movement.schema'
import {
  EnableStockTrackingInput,
  ReceiveStockInput,
  ReconcileStockInput,
  StockMovementFilter,
  StockMovementPageResult,
  StockPageResult,
  StockPagination,
} from './stock.types'

const MAX_DECIMAL_PLACES = 6
const DEFAULT_PAGE_SIZE = 25
const MAX_PAGE_SIZE = 100

interface SaleStockItem {
  productId: string
  productName: string
  quantity: number
  tracked: boolean
}

export interface AppliedSaleStock {
  productId: string
  quantity: Types.Decimal128
  unit: StockUnit
}

const asDecimal128 = (value: Decimal): Types.Decimal128 =>
  Types.Decimal128.fromString(value.toString())

@Injectable()
export class StockService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(Stock.name) private readonly stockModel: Model<StockDocument>,
    @InjectModel(StockMovement.name)
    private readonly movementModel: Model<StockMovementDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
  ) {}

  async list(
    tenantId: string,
    search?: string,
    pagination?: StockPagination,
  ): Promise<StockPageResult> {
    const { page: requestedPage, pageSize } = this.pagination(pagination)
    const filter: QueryFilter<StockDocument> = { tenantId }
    const term = search?.trim()
    if (term) {
      const productIds = await this.productModel
        .find({
          tenantId,
          archivedAt: { $exists: false },
          name: { $regex: this.escapeRegExp(term), $options: 'i' },
        })
        .distinct('_id')
        .exec()
      filter.productId = { $in: productIds.map(String) }
    }

    const totalCount = await this.stockModel.countDocuments(filter).exec()
    const totalPages = Math.ceil(totalCount / pageSize)
    const page = Math.min(requestedPage, Math.max(totalPages, 1))
    const items = await this.stockModel
      .find(filter)
      .sort({ updatedAt: -1, _id: 1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .exec()

    return this.pageResult(items, page, pageSize, totalCount, totalPages)
  }

  findByProduct(tenantId: string, productId: string): Promise<StockDocument | null> {
    this.assertProductId(productId)
    return this.stockModel.findOne({ tenantId, productId }).exec()
  }

  async listMovements(
    tenantId: string,
    filterInput?: StockMovementFilter,
    pagination?: StockPagination,
  ): Promise<StockMovementPageResult> {
    const { page: requestedPage, pageSize } = this.pagination(pagination)
    const filter: QueryFilter<StockMovementDocument> = { tenantId }
    if (filterInput?.productId) {
      this.assertProductId(filterInput.productId)
      filter.productId = filterInput.productId
    }
    if (filterInput?.reason) filter.reason = filterInput.reason
    if (filterInput?.sourceType) filter.sourceType = filterInput.sourceType

    const totalCount = await this.movementModel.countDocuments(filter).exec()
    const totalPages = Math.ceil(totalCount / pageSize)
    const page = Math.min(requestedPage, Math.max(totalPages, 1))
    const items = await this.movementModel
      .find(filter)
      .sort({ postedAt: -1, _id: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .exec()

    return this.pageResult(items, page, pageSize, totalCount, totalPages)
  }

  findProduct(tenantId: string, productId: string): Promise<ProductDocument | null> {
    return this.productModel.findOne({ _id: productId, tenantId }).exec()
  }

  enableTracking(
    tenantId: string,
    input: EnableStockTrackingInput,
    actorId: string,
  ): Promise<StockDocument> {
    this.assertProductId(input.productId)
    const opening = this.decimal(input.openingQuantity, 'Opening quantity', true)
    const occurredAt = this.date(input.occurredAt)

    return this.runManualOperation(tenantId, input.clientMutationId, async (session) => {
      const product = await this.productModel
        .findOne({ _id: input.productId, tenantId, archivedAt: { $exists: false } })
        .session(session)
        .exec()
      if (!product) throw new NotFoundException('The selected product was not found.')

      const existingStock = await this.stockModel
        .findOne({ tenantId, productId: input.productId })
        .session(session)
        .exec()
      if (existingStock || product.stockTrackingEnabled) {
        throw new ConflictException('Stock tracking is already enabled for this product.')
      }

      const [stock] = await this.stockModel.create(
        [{
          tenantId,
          productId: input.productId,
          quantity: asDecimal128(opening),
          unit: input.unit,
          sequence: 1,
        }],
        { session },
      )

      await this.movementModel.create(
        [{
          tenantId,
          stockId: stock._id.toString(),
          productId: input.productId,
          productName: product.name,
          unit: input.unit,
          delta: asDecimal128(opening),
          balanceAfter: asDecimal128(opening),
          reason: StockMovementReason.OPENING,
          sourceType: StockMovementSourceType.STOCK_OPERATION,
          sourceId: input.clientMutationId,
          clientMutationId: input.clientMutationId,
          actorId,
          occurredAt,
          note: input.note?.trim() || undefined,
        }],
        { session },
      )

      product.stockTrackingEnabled = true
      await product.save({ session })
      return stock
    })
  }

  receive(
    tenantId: string,
    input: ReceiveStockInput,
    actorId: string,
  ): Promise<StockDocument> {
    this.assertProductId(input.productId)
    const packageCount = this.decimal(input.packageCount, 'Package count')
    const quantityPerPackage = this.decimal(
      input.quantityPerPackage,
      'Quantity per package',
    )
    const received = packageCount.mul(quantityPerPackage)
    this.assertPrecision(received, 'Received quantity')
    const occurredAt = this.date(input.occurredAt)

    return this.runManualOperation(tenantId, input.clientMutationId, async (session) => {
      const { stock, product } = await this.loadTrackedProduct(
        tenantId,
        input.productId,
        session,
      )
      const updated = await this.incrementStock(stock, received, session)

      await this.movementModel.create(
        [{
          tenantId,
          stockId: stock._id.toString(),
          productId: input.productId,
          productName: product.name,
          unit: stock.unit,
          delta: asDecimal128(received),
          balanceAfter: updated.quantity,
          reason: StockMovementReason.RECEIPT,
          sourceType: StockMovementSourceType.STOCK_OPERATION,
          sourceId: input.clientMutationId,
          clientMutationId: input.clientMutationId,
          actorId,
          occurredAt,
          note: input.note?.trim() || undefined,
          packageLabel: input.packageLabel?.trim() || undefined,
          packageCount: asDecimal128(packageCount),
          quantityPerPackage: asDecimal128(quantityPerPackage),
        }],
        { session },
      )
      return updated
    })
  }

  reconcile(
    tenantId: string,
    input: ReconcileStockInput,
    actorId: string,
  ): Promise<StockDocument> {
    this.assertProductId(input.productId)
    const counted = this.decimal(input.countedQuantity, 'Counted quantity', true)
    const occurredAt = this.date(input.occurredAt)

    return this.runManualOperation(tenantId, input.clientMutationId, async (session) => {
      const { stock, product } = await this.loadTrackedProduct(
        tenantId,
        input.productId,
        session,
      )
      const current = new Decimal(stock.quantity.toString())
      const delta = counted.minus(current)
      const updated = await this.stockModel
        .findOneAndUpdate(
          { _id: stock._id, tenantId },
          { $set: { quantity: asDecimal128(counted) }, $inc: { sequence: 1 } },
          { returnDocument: 'after', session },
        )
        .exec()
      if (!updated) throw new ConflictException('The stock balance changed. Please try again.')

      await this.movementModel.create(
        [{
          tenantId,
          stockId: stock._id.toString(),
          productId: input.productId,
          productName: product.name,
          unit: stock.unit,
          delta: asDecimal128(delta),
          balanceAfter: updated.quantity,
          reason: StockMovementReason.CORRECTION,
          sourceType: StockMovementSourceType.STOCK_OPERATION,
          sourceId: input.clientMutationId,
          clientMutationId: input.clientMutationId,
          actorId,
          occurredAt,
          note: input.note.trim(),
        }],
        { session },
      )
      return updated
    })
  }

  async applySale(
    tenantId: string,
    transactionId: string,
    occurredAt: Date,
    actorId: string,
    items: SaleStockItem[],
    session: ClientSession,
  ): Promise<AppliedSaleStock[]> {
    const quantities = new Map<string, { productName: string; quantity: Decimal }>()
    for (const item of items) {
      if (!item.tracked) continue
      const current = quantities.get(item.productId)
      if (current) current.quantity = current.quantity.plus(item.quantity)
      else {
        quantities.set(item.productId, {
          productName: item.productName,
          quantity: new Decimal(item.quantity),
        })
      }
    }

    const productIds = [...quantities.keys()].sort()
    if (productIds.length === 0) return []
    const stocks = await this.stockModel
      .find({ tenantId, productId: { $in: productIds } })
      .session(session)
      .exec()
    const byProduct = new Map(stocks.map((stock) => [stock.productId, stock]))
    const applied: AppliedSaleStock[] = []

    for (const productId of productIds) {
      const stock = byProduct.get(productId)
      if (!stock) {
        throw new ConflictException(
          'A tracked product is missing its stock configuration.',
          { details: { productId } },
        )
      }
      const item = quantities.get(productId)!
      const delta = item.quantity.negated()
      const updated = await this.incrementStock(stock, delta, session)
      await this.movementModel.create(
        [{
          tenantId,
          stockId: stock._id.toString(),
          productId,
          productName: item.productName,
          unit: stock.unit,
          delta: asDecimal128(delta),
          balanceAfter: updated.quantity,
          reason: StockMovementReason.SALE,
          sourceType: StockMovementSourceType.TRANSACTION,
          sourceId: transactionId,
          actorId,
          occurredAt,
        }],
        { session },
      )
      applied.push({
        productId,
        quantity: asDecimal128(item.quantity),
        unit: stock.unit,
      })
    }
    return applied
  }

  async reverseSale(
    tenantId: string,
    transactionId: string,
    actorId: string,
    session: ClientSession,
  ): Promise<void> {
    const movements = await this.movementModel
      .find({
        tenantId,
        sourceType: StockMovementSourceType.TRANSACTION,
        sourceId: transactionId,
        reason: StockMovementReason.SALE,
      })
      .sort({ productId: 1 })
      .session(session)
      .exec()

    for (const movement of movements) {
      const stock = await this.stockModel
        .findOne({ _id: movement.stockId, tenantId })
        .session(session)
        .exec()
      if (!stock) {
        throw new ConflictException('The original stock balance could not be restored.')
      }
      const reversal = new Decimal(movement.delta.toString()).negated()
      const updated = await this.incrementStock(stock, reversal, session)
      await this.movementModel.create(
        [{
          tenantId,
          stockId: movement.stockId,
          productId: movement.productId,
          productName: movement.productName,
          unit: movement.unit,
          delta: asDecimal128(reversal),
          balanceAfter: updated.quantity,
          reason: StockMovementReason.VOID,
          sourceType: StockMovementSourceType.TRANSACTION,
          sourceId: transactionId,
          actorId,
          occurredAt: new Date(),
          note: 'Stock restored after sale void.',
        }],
        { session },
      )
    }
  }

  private async runManualOperation(
    tenantId: string,
    clientMutationId: string,
    operation: (session: ClientSession) => Promise<StockDocument>,
  ): Promise<StockDocument> {
    if (!clientMutationId?.trim()) {
      throw new InvalidInputException('A client mutation ID is required.')
    }
    const existing = await this.findManualOperationStock(tenantId, clientMutationId)
    if (existing) return existing

    const session = await this.connection.startSession()
    try {
      let result: StockDocument | undefined
      await session.withTransaction(async () => {
        const repeated = await this.findManualOperationStock(
          tenantId,
          clientMutationId,
          session,
        )
        result = repeated ?? await operation(session)
      })
      return result!
    } catch (error: any) {
      if (error?.code === 11000) {
        const repeated = await this.findManualOperationStock(tenantId, clientMutationId)
        if (repeated) return repeated
      }
      throw error
    } finally {
      await session.endSession()
    }
  }

  private async findManualOperationStock(
    tenantId: string,
    clientMutationId: string,
    session?: ClientSession,
  ): Promise<StockDocument | null> {
    const query = this.movementModel.findOne({
      tenantId,
      sourceType: StockMovementSourceType.STOCK_OPERATION,
      clientMutationId,
    })
    if (session) query.session(session)
    const movement = await query.exec()
    if (!movement) return null
    const stockQuery = this.stockModel.findOne({ _id: movement.stockId, tenantId })
    if (session) stockQuery.session(session)
    return stockQuery.exec()
  }

  private async loadTrackedProduct(
    tenantId: string,
    productId: string,
    session: ClientSession,
  ): Promise<{ stock: StockDocument; product: ProductDocument }> {
    const product = await this.productModel
      .findOne({ _id: productId, tenantId, archivedAt: { $exists: false } })
      .session(session)
      .exec()
    if (!product) throw new NotFoundException('The selected product was not found.')
    const stock = await this.stockModel
      .findOne({ tenantId, productId })
      .session(session)
      .exec()
    if (!stock || !product.stockTrackingEnabled) {
      throw new ConflictException('Stock tracking is not enabled for this product.')
    }
    return { stock, product }
  }

  private async incrementStock(
    stock: StockDocument,
    delta: Decimal,
    session: ClientSession,
  ): Promise<StockDocument> {
    const updated = await this.stockModel
      .findOneAndUpdate(
        { _id: stock._id, tenantId: stock.tenantId },
        { $inc: { quantity: asDecimal128(delta), sequence: 1 } },
        { returnDocument: 'after', session },
      )
      .exec()
    if (!updated) throw new ConflictException('The stock balance changed. Please try again.')
    return updated
  }

  private decimal(value: string, label: string, allowZero = false): Decimal {
    let decimal: Decimal
    try {
      decimal = new Decimal(value)
    } catch {
      throw new InvalidInputException(`${label} must be a valid decimal value.`)
    }
    if (!decimal.isFinite() || (allowZero ? decimal.isNegative() : !decimal.isPositive())) {
      throw new InvalidInputException(
        `${label} must be ${allowZero ? 'zero or greater' : 'greater than zero'}.`,
      )
    }
    this.assertPrecision(decimal, label)
    return decimal
  }

  private assertPrecision(value: Decimal, label: string): void {
    if (value.decimalPlaces() > MAX_DECIMAL_PLACES) {
      throw new InvalidInputException(
        `${label} cannot contain more than ${MAX_DECIMAL_PLACES} decimal places.`,
      )
    }
  }

  private date(value?: string): Date {
    const date = value ? new Date(value) : new Date()
    if (Number.isNaN(date.getTime())) {
      throw new InvalidInputException('The occurrence date is invalid.')
    }
    return date
  }

  private assertProductId(productId: string): void {
    if (!isValidObjectId(productId)) {
      throw new InvalidInputException('A valid product is required.')
    }
  }

  private pagination(input?: StockPagination): { page: number; pageSize: number } {
    const page = input?.page ?? 1
    const pageSize = input?.pageSize ?? DEFAULT_PAGE_SIZE
    if (!Number.isInteger(page) || page < 1) {
      throw new InvalidInputException('Page must be a positive whole number.')
    }
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
      throw new InvalidInputException(`Page size must be between 1 and ${MAX_PAGE_SIZE}.`)
    }
    return { page, pageSize }
  }

  private pageResult<T>(
    items: T[],
    page: number,
    pageSize: number,
    totalCount: number,
    totalPages: number,
  ) {
    return {
      items,
      page,
      pageSize,
      totalCount,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1 && totalPages > 0,
    }
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }
}
