import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument } from 'mongoose'

export enum ProductCategory {
  Main = 'main',
  AddOn = 'add-on',
}

export type ProductDocument = HydratedDocument<Product>

@Schema({ timestamps: true })
export class Product {
  @Prop({ required: true, trim: true })
  name: string

  @Prop({ required: true })
  price: number

  @Prop()
  imageUrl?: string

  @Prop()
  printCount?: number

  @Prop({ required: true, enum: Object.values(ProductCategory), default: ProductCategory.Main })
  category: ProductCategory
}

export const ProductSchema = SchemaFactory.createForClass(Product)
