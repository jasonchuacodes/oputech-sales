import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument } from 'mongoose'

export type ReportDocument = HydratedDocument<Report>

@Schema({ _id: false })
class ProductSale {
  @Prop({ required: true })
  productId: string

  @Prop({ required: true })
  name: string

  @Prop({ required: true })
  quantitySold: number

  @Prop({ required: true })
  pricePerUnit: number

  @Prop({ required: true, default: 0 })
  printCount: number
}

const ProductSaleSchema = SchemaFactory.createForClass(ProductSale)

@Schema({ timestamps: true })
export class Report {
  @Prop({ required: true })
  createdBy: string

  @Prop({ required: true })
  fromDate: Date

  @Prop({ required: true })
  toDate: Date

  @Prop({ type: [String], required: true })
  transactionIds: string[]

  @Prop({ type: [ProductSaleSchema], required: true })
  products: ProductSale[]

  @Prop({ required: true, default: false })
  isRemitted: boolean
}

export const ReportSchema = SchemaFactory.createForClass(Report)
