import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument } from 'mongoose'

export enum ProductImportRowAction {
  CREATE = 'CREATE',
  ENABLE_STOCK = 'ENABLE_STOCK',
  RECONCILE = 'RECONCILE',
  UNCHANGED = 'UNCHANGED',
}

export enum ProductImportRowStatus {
  PENDING = 'PENDING',
  APPLIED = 'APPLIED',
  SKIPPED = 'SKIPPED',
}

export type ProductImportRowDocument = HydratedDocument<ProductImportRow>

@Schema({ timestamps: true })
export class ProductImportRow {
  createdAt: Date
  updatedAt: Date

  @Prop({ required: true, index: true })
  jobId: string

  @Prop({ required: true, index: true })
  tenantId: string

  @Prop({ required: true })
  rowNumber: number

  @Prop()
  productId?: string

  @Prop({ required: true })
  productName: string

  @Prop({ required: true })
  normalizedName: string

  @Prop()
  price?: number

  @Prop()
  unit?: string

  @Prop()
  quantity?: string

  @Prop({ required: true, enum: Object.values(ProductImportRowAction) })
  action: ProductImportRowAction

  @Prop({ required: true, enum: Object.values(ProductImportRowStatus) })
  status: ProductImportRowStatus

  @Prop()
  skipReason?: string

  @Prop({ required: true })
  expiresAt: Date
}

export const ProductImportRowSchema =
  SchemaFactory.createForClass(ProductImportRow)
ProductImportRowSchema.index({ jobId: 1, rowNumber: 1 }, { unique: true })
ProductImportRowSchema.index({ jobId: 1, status: 1, rowNumber: 1 })
ProductImportRowSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
