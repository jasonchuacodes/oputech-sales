import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { Transaction, TransactionSchema } from './schemas/transaction.schema'
import { Product, ProductSchema } from '../product/schemas/product.schema'
import { TransactionService } from './transaction.service'
import { TransactionResolver } from './transaction.resolver'
import { TenantModule } from '../tenant/tenant.module'
import { StockModule } from '../stock/stock.module'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
    TenantModule,
    StockModule,
  ],
  providers: [TransactionService, TransactionResolver],
})
export class TransactionModule {}
