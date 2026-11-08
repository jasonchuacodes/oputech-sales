import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, SchemaTypes, Types } from 'mongoose'
import { StockUnit } from './stock.schema'

export enum StockMovementReason {
  OPENING = 'OPENING',
  RECEIPT = 'RECEIPT',
  SALE = 'SALE',
  VOID = 'VOID',
  CORRECTION = 'CORRECTION',
}

export enum StockMovementSourceType {
  TRANSACTION = 'TRANSACTION',
  STOCK_OPERATION = 'STOCK_OPERATION',
}

export type StockMovementDocument = HydratedDocument<StockMovement>

@Schema({ timestamps: { createdAt: 'postedAt', updatedAt: false } })
export class StockMovement {
  postedAt: Date

  @Prop({ required: true, index: true })
  tenantId: string

  @Prop({ required: true })
  stockId: string

  @Prop({ required: true })
  productId: string

  @Prop({ required: true })
  productName: string

  @Prop({ required: true, enum: Object.values(StockUnit) })
  unit: StockUnit

  @Prop({ type: SchemaTypes.Decimal128, required: true })
  delta: Types.Decimal128

  @Prop({ type: SchemaTypes.Decimal128, required: true })
  balanceAfter: Types.Decimal128

  @Prop({ required: true, enum: Object.values(StockMovementReason) })
  reason: StockMovementReason

  @Prop({ required: true, enum: Object.values(StockMovementSourceType) })
  sourceType: StockMovementSourceType

  @Prop({ required: true })
  sourceId: string

  @Prop()
  clientMutationId?: string

  @Prop()
  actorId?: string

  @Prop({ required: true })
  occurredAt: Date

  @Prop({ trim: true, maxlength: 500 })
  note?: string

  @Prop({ trim: true, maxlength: 80 })
  packageLabel?: string

  @Prop({ type: SchemaTypes.Decimal128 })
  packageCount?: Types.Decimal128

  @Prop({ type: SchemaTypes.Decimal128 })
  quantityPerPackage?: Types.Decimal128
}

export const StockMovementSchema = SchemaFactory.createForClass(StockMovement)
StockMovementSchema.index({ tenantId: 1, productId: 1, postedAt: -1 })
StockMovementSchema.index({ tenantId: 1, reason: 1, postedAt: -1 })
StockMovementSchema.index(
  { tenantId: 1, sourceType: 1, sourceId: 1, productId: 1, reason: 1 },
  { unique: true },
)
StockMovementSchema.index(
  { tenantId: 1, clientMutationId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      sourceType: StockMovementSourceType.STOCK_OPERATION,
      clientMutationId: { $type: 'string' },
    },
  },
)
