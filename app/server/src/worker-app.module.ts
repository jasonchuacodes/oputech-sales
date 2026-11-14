import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { ProductTransferWorkerModule } from './features/product-transfer/product-transfer-worker.module'

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGO_URI as string),
    ProductTransferWorkerModule,
  ],
})
export class WorkerAppModule {}
