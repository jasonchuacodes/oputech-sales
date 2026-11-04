import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { Product, ProductSchema } from './schemas/product.schema'
import { ProductService } from './product.service'
import { ProductResolver } from './product.resolver'
import { TenantModule } from '../tenant/tenant.module'
import { AdminGuard } from '../auth/guards/admin.guard'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
    ]),
    TenantModule,
  ],
  providers: [ProductService, ProductResolver, AdminGuard],
})
export class ProductModule {}
