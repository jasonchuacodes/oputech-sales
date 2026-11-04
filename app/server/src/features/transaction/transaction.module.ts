import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { Transaction, TransactionSchema } from './schemas/transaction.schema'
import { Product, ProductSchema } from '../product/schemas/product.schema'
import { TransactionService } from './transaction.service'
import { TransactionResolver } from './transaction.resolver'
import { TenantModule } from '../tenant/tenant.module'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
    TenantModule,
  ],
  providers: [TransactionService, TransactionResolver],
})
export class TransactionModule {}
