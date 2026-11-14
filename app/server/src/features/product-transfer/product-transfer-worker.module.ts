import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { PRODUCT_TRANSFER_QUEUE } from './product-transfer.constants'
import {
  PRODUCT_TRANSFER_CONFIG,
  ProductTransferConfigModule,
} from './product-transfer.config'
import { ProductTransferCoreModule } from './product-transfer-core.module'
import { ProductTransferProcessor } from './product-transfer.processor'
import { ProductTransferQueueService } from './product-transfer-queue.service'
import { createProductTransferRedisConnection } from './product-transfer.redis'
import { ProductTransferConfig } from './product-transfer.types'
import { ProductImportService } from './product-import.service'
import { ProductExportService } from './product-export.service'

@Module({
  imports: [
    ProductTransferConfigModule,
    BullModule.forRootAsync({
      imports: [ProductTransferConfigModule],
      inject: [PRODUCT_TRANSFER_CONFIG],
      useFactory: (config: ProductTransferConfig) => ({
        connection: createProductTransferRedisConnection(config, true),
      }),
    }),
    BullModule.registerQueue({ name: PRODUCT_TRANSFER_QUEUE }),
    ProductTransferCoreModule,
  ],
  providers: [
    ProductTransferQueueService,
    ProductImportService,
    ProductExportService,
    ProductTransferProcessor,
  ],
})
export class ProductTransferWorkerModule {}
