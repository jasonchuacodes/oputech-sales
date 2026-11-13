import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument } from 'mongoose'
import { STOCK_UNIT_MAX_LENGTH } from '../../stock/stock-unit'

export type TenantDocument = HydratedDocument<Tenant>

@Schema({ _id: false })
export class TenantStockUnit {
  @Prop({ required: true, trim: true, maxlength: STOCK_UNIT_MAX_LENGTH })
  label: string

  @Prop({ required: true })
  normalizedLabel: string

  @Prop({ required: true, default: Date.now })
  createdAt: Date
}

const TenantStockUnitSchema = SchemaFactory.createForClass(TenantStockUnit)

@Schema({ timestamps: true })
export class Tenant {
  @Prop({ required: true, trim: true, minlength: 1, maxlength: 80 })
  name: string

  @Prop({ required: true, index: true })
  ownerUserId: string

  @Prop({ type: [TenantStockUnitSchema], default: [] })
  stockUnits: TenantStockUnit[]
}

export const TenantSchema = SchemaFactory.createForClass(Tenant)
TenantSchema.index({ ownerUserId: 1, name: 1 })
