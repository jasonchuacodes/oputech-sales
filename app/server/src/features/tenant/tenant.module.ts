import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { User, UserSchema } from '../users/schemas/user.schema'
import { SuperAdminGuard } from '../auth/guards/superadmin.guard'
import { Product, ProductSchema } from '../product/schemas/product.schema'
import {
  Transaction,
  TransactionSchema,
} from '../transaction/schemas/transaction.schema'
import { Report, ReportSchema } from '../report/schemas/report.schema'
import { Aggregate, AggregateSchema } from '../report/schemas/aggregate.schema'
import { Tenant, TenantSchema } from './schemas/tenant.schema'
import { TenantAccessGuard } from './guards/tenant-access.guard'
import { TenantResolver } from './tenant.resolver'
import { TenantService } from './tenant.service'
import {
  StockMovement,
  StockMovementSchema,
} from '../stock/schemas/stock-movement.schema'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Tenant.name, schema: TenantSchema },
      { name: User.name, schema: UserSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: Report.name, schema: ReportSchema },
      { name: Aggregate.name, schema: AggregateSchema },
      { name: StockMovement.name, schema: StockMovementSchema },
    ]),
  ],
  providers: [
    TenantService,
    TenantResolver,
    TenantAccessGuard,
    SuperAdminGuard,
  ],
  exports: [TenantService, TenantAccessGuard, SuperAdminGuard],
})
export class TenantModule {}
