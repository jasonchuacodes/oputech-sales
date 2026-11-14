import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { S3Client } from '@aws-sdk/client-s3'
import { ProductModule } from '../product/product.module'
import { StockModule } from '../stock/stock.module'
import {
  ProductImportRow,
  ProductImportRowSchema,
} from './schemas/product-import-row.schema'
import {
  ProductTransferJob,
  ProductTransferJobSchema,
} from './schemas/product-transfer-job.schema'
import {
  PRODUCT_TRANSFER_CONFIG,
  ProductTransferConfigModule,
} from './product-transfer.config'
import { ProductTransferConfig } from './product-transfer.types'
import {
  PRODUCT_TRANSFER_S3_CLIENT,
  ProductStorageService,
} from './product-storage.service'
import { ProductWorkbookService } from './product-workbook.service'
import { ProductTransferService } from './product-transfer.service'

@Module({
  imports: [
    ProductTransferConfigModule,
    MongooseModule.forFeature([
      { name: ProductTransferJob.name, schema: ProductTransferJobSchema },
      { name: ProductImportRow.name, schema: ProductImportRowSchema },
    ]),
    ProductModule,
    StockModule,
  ],
  providers: [
    {
      provide: PRODUCT_TRANSFER_S3_CLIENT,
      inject: [PRODUCT_TRANSFER_CONFIG],
      useFactory: (config: ProductTransferConfig) =>
        new S3Client({ region: config.awsRegion }),
    },
    ProductStorageService,
    ProductWorkbookService,
    ProductTransferService,
  ],
  exports: [
    ProductModule,
    StockModule,
    ProductStorageService,
    ProductWorkbookService,
    ProductTransferService,
  ],
})
export class ProductTransferCoreModule {}
