import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument } from 'mongoose'

export type AggregateDocument = HydratedDocument<Aggregate>

// One document per day. Reports roll their totals into the matching day's
// document via ReportService.aggregate, and deleteReport rolls them back out
// via deaggregate. Powers the dashboard sales/expenses time series.
@Schema({ timestamps: true })
export class Aggregate {
  @Prop({ required: true, unique: true, index: true })
  date: Date

  @Prop({ required: true, default: 0 })
  totalSales: number

  @Prop({ required: true, default: 0 })
  totalExpenses: number
}

export const AggregateSchema = SchemaFactory.createForClass(Aggregate)
