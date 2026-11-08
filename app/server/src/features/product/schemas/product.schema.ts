import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument } from 'mongoose'

export type ProductDocument = HydratedDocument<Product>

@Schema({ timestamps: true })
export class Product {
  @Prop({ required: true, index: true })
  tenantId: string

  @Prop({ required: true, trim: true })
  name: string

  @Prop({ required: true })
  price: number

  @Prop()
  imageUrl?: string

  @Prop()
  printCount?: number
}

export const ProductSchema = SchemaFactory.createForClass(Product)
ProductSchema.index({ tenantId: 1, name: 1 })
ProductSchema.index({ tenantId: 1, _id: 1 })
