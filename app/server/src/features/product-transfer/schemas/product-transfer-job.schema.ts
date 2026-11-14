import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument } from 'mongoose'

export enum ProductTransferType {
  IMPORT = 'IMPORT',
  EXPORT = 'EXPORT',
}

export enum ProductTransferStatus {
  AWAITING_UPLOAD = 'AWAITING_UPLOAD',
  QUEUED_FOR_VALIDATION = 'QUEUED_FOR_VALIDATION',
  VALIDATING = 'VALIDATING',
  AWAITING_CONFIRMATION = 'AWAITING_CONFIRMATION',
  QUEUED_FOR_IMPORT = 'QUEUED_FOR_IMPORT',
  IMPORTING = 'IMPORTING',
  QUEUED = 'QUEUED',
  EXPORTING = 'EXPORTING',
  COMPLETED = 'COMPLETED',
  COMPLETED_WITH_SKIPS = 'COMPLETED_WITH_SKIPS',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export const ACTIVE_PRODUCT_TRANSFER_STATUSES = [
  ProductTransferStatus.AWAITING_UPLOAD,
  ProductTransferStatus.QUEUED_FOR_VALIDATION,
  ProductTransferStatus.VALIDATING,
  ProductTransferStatus.AWAITING_CONFIRMATION,
  ProductTransferStatus.QUEUED_FOR_IMPORT,
  ProductTransferStatus.IMPORTING,
  ProductTransferStatus.QUEUED,
  ProductTransferStatus.EXPORTING,
] as const

export type ProductTransferJobDocument = HydratedDocument<ProductTransferJob>

@Schema({ timestamps: true })
export class ProductTransferJob {
  createdAt: Date
  updatedAt: Date

  @Prop({ required: true, index: true })
  tenantId: string

  @Prop({ required: true })
  requestedBy: string

  @Prop({ required: true, enum: Object.values(ProductTransferType) })
  type: ProductTransferType

  @Prop({
    required: true,
    enum: Object.values(ProductTransferStatus),
    index: true,
  })
  status: ProductTransferStatus

  @Prop({ required: true, default: true })
  active: boolean

  @Prop()
  inputKey?: string

  @Prop()
  outputKey?: string

  @Prop()
  errorKey?: string

  @Prop({ required: true, default: 0 })
  totalRows: number

  @Prop({ required: true, default: 0 })
  eligibleRows: number

  @Prop({ required: true, default: 0 })
  skippedRows: number

  @Prop({ required: true, default: 0 })
  validatedRows: number

  @Prop({ required: true, default: 0 })
  appliedRows: number

  @Prop({ required: true, default: 0 })
  createdCount: number

  @Prop({ required: true, default: 0 })
  updatedCount: number

  @Prop({ required: true, default: 0 })
  unchangedCount: number

  @Prop()
  failureCode?: string

  @Prop()
  failureMessage?: string

  @Prop()
  startedAt?: Date

  @Prop()
  completedAt?: Date

  @Prop()
  filesExpireAt?: Date
}

export const ProductTransferJobSchema =
  SchemaFactory.createForClass(ProductTransferJob)
ProductTransferJobSchema.index({ tenantId: 1, createdAt: -1 })
ProductTransferJobSchema.index(
  { tenantId: 1, active: 1 },
  { unique: true, partialFilterExpression: { active: true } }
)
