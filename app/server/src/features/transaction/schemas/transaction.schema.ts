import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument } from 'mongoose'

export enum PaymentType {
  CASH = 'CASH',
  ONLINE = 'ONLINE',
}

export enum TransactionType {
  SALE = 'SALE',
  EXPENSE = 'EXPENSE',
}

export type TransactionDocument = HydratedDocument<Transaction>

@Schema({ _id: false })
class TransactionItem {
  @Prop({ required: true })
  productId: string

  @Prop({ required: true })
  name: string

  @Prop({ required: true })
  price: number

  @Prop({ required: true, default: 0 })
  printCount: number

  @Prop({ required: true })
  quantity: number
}

const TransactionItemSchema = SchemaFactory.createForClass(TransactionItem)

@Schema({ timestamps: true })
export class Transaction {
  createdAt: Date

  updatedAt: Date

  @Prop({ required: true, index: true })
  tenantId: string

  @Prop()
  clientMutationId?: string

  @Prop({ required: true, default: Date.now, index: true })
  occurredAt: Date

  @Prop({ required: true, enum: Object.values(TransactionType), default: TransactionType.SALE })
  type: TransactionType

  @Prop({ type: [TransactionItemSchema], required: true, default: [] })
  items: TransactionItem[]

  @Prop({ trim: true })
  label?: string

  @Prop({ required: true, enum: Object.values(PaymentType) })
  paymentType: PaymentType

  @Prop({ required: true })
  total: number

  @Prop({ required: true, default: false })
  processed: boolean
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction)
TransactionSchema.index({ tenantId: 1, occurredAt: -1 })
TransactionSchema.index({ tenantId: 1, processed: 1, occurredAt: 1 })
TransactionSchema.index(
  { tenantId: 1, clientMutationId: 1 },
  { unique: true, partialFilterExpression: { clientMutationId: { $type: 'string' } } },
)
