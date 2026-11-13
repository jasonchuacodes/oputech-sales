import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { Product, ProductSchema } from '../product/schemas/product.schema'
import { TenantModule } from '../tenant/tenant.module'
import { AdminGuard } from '../auth/guards/admin.guard'
import {
  StockMovement,
  StockMovementSchema,
} from './schemas/stock-movement.schema'
import { StockService } from './stock.service'
import { StockMovementResolver, StockResolver } from './stock.resolver'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: StockMovement.name, schema: StockMovementSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
    TenantModule,
  ],
  providers: [StockService, StockResolver, StockMovementResolver, AdminGuard],
  exports: [StockService, MongooseModule],
})
export class StockModule {}
