import { Injectable } from '@nestjs/common'
import { ProductService } from '../product/product.service'
import { MAX_PRODUCT_TRANSFER_ROWS } from './product-transfer.constants'
import { ProductStorageService } from './product-storage.service'
import { ProductTransferService } from './product-transfer.service'
import { ProductWorkbookService } from './product-workbook.service'

@Injectable()
export class ProductExportService {
  constructor(
    private readonly transfers: ProductTransferService,
    private readonly products: ProductService,
    private readonly storage: ProductStorageService,
    private readonly workbooks: ProductWorkbookService
  ) {}

  async generateExport(jobId: string): Promise<void> {
    const job = await this.transfers.beginExport(jobId)
    const count = await this.products.countActive(job.tenantId)
    if (count > MAX_PRODUCT_TRANSFER_ROWS) {
      await this.transfers.failJob(
        jobId,
        `The catalog exceeds the ${MAX_PRODUCT_TRANSFER_ROWS.toLocaleString()}-product export limit.`
      )
      return
    }
    const products = await this.products.listActiveForTransfer(
      job.tenantId,
      MAX_PRODUCT_TRANSFER_ROWS
    )
    const outputKey =
      job.outputKey ?? this.storage.exportOutputKey(job.tenantId, jobId)
    await this.storage.upload(
      outputKey,
      await this.workbooks.createExportWorkbook(products)
    )
    await this.transfers.completeExport(jobId, products.length)
  }
}
