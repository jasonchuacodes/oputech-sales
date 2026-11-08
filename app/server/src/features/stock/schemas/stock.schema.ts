import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, SchemaTypes, Types } from 'mongoose'

export enum StockUnit {
  KG = 'kg',
  G = 'g',
  L = 'L',
  ML = 'mL',
  PC = 'pc',
  GAL = 'gal',
  BAG = 'bag',
}

export type StockDocument = HydratedDocument<Stock>

@Schema({ timestamps: true })
export class Stock {
  createdAt: Date
  updatedAt: Date

  @Prop({ required: true, index: true })
  tenantId: string

  @Prop({ required: true })
  productId: string

  @Prop({ type: SchemaTypes.Decimal128, required: true })
  quantity: Types.Decimal128

  @Prop({ required: true, enum: Object.values(StockUnit) })
  unit: StockUnit

  @Prop({ required: true, default: 0 })
  sequence: number
}

export const StockSchema = SchemaFactory.createForClass(Stock)
StockSchema.index({ tenantId: 1, productId: 1 }, { unique: true })
StockSchema.index({ tenantId: 1, updatedAt: -1 })
