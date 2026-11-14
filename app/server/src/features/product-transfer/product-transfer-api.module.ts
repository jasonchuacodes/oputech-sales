import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { AdminGuard } from '../auth/guards/admin.guard'
import { TenantModule } from '../tenant/tenant.module'
import { PRODUCT_TRANSFER_QUEUE } from './product-transfer.constants'
import {
  PRODUCT_TRANSFER_CONFIG,
  ProductTransferConfigModule,
} from './product-transfer.config'
import { ProductTransferCoreModule } from './product-transfer-core.module'
import { createProductTransferRedisConnection } from './product-transfer.redis'
import { ProductTransferConfig } from './product-transfer.types'
import { ProductTransferApiService } from './product-transfer-api.service'
import { ProductTransferQueueService } from './product-transfer-queue.service'
import { ProductTransferResolver } from './product-transfer.resolver'

@Module({
  imports: [
    ProductTransferConfigModule,
    BullModule.forRootAsync({
      imports: [ProductTransferConfigModule],
      inject: [PRODUCT_TRANSFER_CONFIG],
      useFactory: (config: ProductTransferConfig) => ({
        connection: createProductTransferRedisConnection(config, false),
      }),
    }),
    BullModule.registerQueue({ name: PRODUCT_TRANSFER_QUEUE }),
    ProductTransferCoreModule,
    TenantModule,
  ],
  providers: [
    ProductTransferApiService,
    ProductTransferQueueService,
    ProductTransferResolver,
    AdminGuard,
  ],
})
export class ProductTransferApiModule {}
