import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument } from 'mongoose'

export type TenantDocument = HydratedDocument<Tenant>

@Schema({ timestamps: true })
export class Tenant {
  @Prop({ required: true, trim: true, minlength: 1, maxlength: 80 })
  name: string

  @Prop({ required: true, index: true })
  ownerUserId: string
}

export const TenantSchema = SchemaFactory.createForClass(Tenant)
TenantSchema.index({ ownerUserId: 1, name: 1 })
