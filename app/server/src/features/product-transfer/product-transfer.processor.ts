import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Job } from 'bullmq'
import { InvalidInputException } from '../../common/exceptions'
import {
  PRODUCT_TRANSFER_QUEUE,
  ProductTransferJobName,
} from './product-transfer.constants'
import { ProductExportService } from './product-export.service'
import { ProductImportService } from './product-import.service'
import { ProductTransferService } from './product-transfer.service'
import { ProductTransferQueuePayload } from './product-transfer.types'
import { failureMessage } from './product-transfer.utils'

const configuredConcurrency = Number(
  process.env.PRODUCT_TRANSFER_WORKER_CONCURRENCY ?? 1
)
const workerConcurrency =
  Number.isInteger(configuredConcurrency) &&
  configuredConcurrency >= 1 &&
  configuredConcurrency <= 4
    ? configuredConcurrency
    : 1

@Processor(PRODUCT_TRANSFER_QUEUE, { concurrency: workerConcurrency })
export class ProductTransferProcessor extends WorkerHost {
  constructor(
    private readonly imports: ProductImportService,
    private readonly exports: ProductExportService,
    private readonly transfers: ProductTransferService
  ) {
    super()
  }

  async process(job: Job<ProductTransferQueuePayload>): Promise<void> {
    try {
      switch (job.name) {
        case ProductTransferJobName.VALIDATE_IMPORT:
          await this.imports.validateImport(job.data.transferJobId)
          return
        case ProductTransferJobName.APPLY_IMPORT:
          await this.imports.applyImport(job.data.transferJobId, job)
          return
        case ProductTransferJobName.GENERATE_EXPORT:
          await this.exports.generateExport(job.data.transferJobId)
          return
        default:
          throw new InvalidInputException(
            `Unsupported product transfer job: ${job.name}.`
          )
      }
    } catch (error) {
      const attempts = job.opts.attempts ?? 1
      if (job.attemptsMade + 1 >= attempts) {
        await this.transfers.failJob(
          job.data.transferJobId,
          failureMessage(error)
        )
      }
      throw error
    }
  }
}
