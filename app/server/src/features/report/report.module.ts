import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { Report, ReportSchema } from './schemas/report.schema'
import { Aggregate, AggregateSchema } from './schemas/aggregate.schema'
import { Transaction, TransactionSchema } from '../transaction/schemas/transaction.schema'
import { Product, ProductSchema } from '../product/schemas/product.schema'
import { UsersModule } from '../users/users.module'
import { ReportService } from './report.service'
import { ReportResolver, ProductSaleResolver } from './report.resolver'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Report.name, schema: ReportSchema },
      { name: Aggregate.name, schema: AggregateSchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
    UsersModule,
  ],
  providers: [ReportService, ReportResolver, ProductSaleResolver],
  exports: [ReportService],
})
export class ReportModule {}
