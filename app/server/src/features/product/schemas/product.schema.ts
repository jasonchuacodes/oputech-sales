import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, SchemaTypes, Types } from 'mongoose'

@Schema({ _id: false })
export class ProductInventory {
  @Prop({ type: SchemaTypes.Decimal128, required: true })
  stockCount: Types.Decimal128

  @Prop({ required: true, trim: true })
  unit: string

  @Prop({ required: true, default: 1, min: 1 })
  revision: number
}

const ProductInventorySchema = SchemaFactory.createForClass(ProductInventory)

export type ProductDocument = HydratedDocument<Product>

@Schema({ timestamps: true })
export class Product {
  createdAt: Date
  updatedAt: Date

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

  @Prop({ type: ProductInventorySchema })
  inventory?: ProductInventory

  @Prop()
  archivedAt?: Date
}

export const ProductSchema = SchemaFactory.createForClass(Product)
ProductSchema.index({ tenantId: 1, name: 1 })
ProductSchema.index({ tenantId: 1, _id: 1 })
ProductSchema.index({ tenantId: 1, 'inventory.stockCount': 1 })
