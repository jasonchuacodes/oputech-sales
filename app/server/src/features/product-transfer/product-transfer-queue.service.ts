import { Injectable, OnModuleInit } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bullmq'
import { JobsOptions, Queue } from 'bullmq'
import {
  PRODUCT_TRANSFER_QUEUE,
  ProductTransferJobName,
} from './product-transfer.constants'
import { ProductTransferQueuePayload } from './product-transfer.types'
import {
  ProductTransferStatus,
  ProductTransferType,
} from './schemas/product-transfer-job.schema'
import { ProductTransferService } from './product-transfer.service'

const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5_000 },
  removeOnComplete: { age: 24 * 60 * 60, count: 200 },
  removeOnFail: { age: 7 * 24 * 60 * 60, count: 500 },
}

@Injectable()
export class ProductTransferQueueService implements OnModuleInit {
  constructor(
    @InjectQueue(PRODUCT_TRANSFER_QUEUE)
    private readonly queue: Queue<ProductTransferQueuePayload>,
    private readonly transfers: ProductTransferService
  ) {}

  async onModuleInit(): Promise<void> {
    await this.queue.waitUntilReady()
    await this.recoverQueuedJobs()
  }

  queueValidation(transferJobId: string): Promise<unknown> {
    return this.queue.add(
      ProductTransferJobName.VALIDATE_IMPORT,
      { transferJobId },
      { ...DEFAULT_JOB_OPTIONS, jobId: `validate-${transferJobId}` }
    )
  }

  queueImport(transferJobId: string): Promise<unknown> {
    return this.queue.add(
      ProductTransferJobName.APPLY_IMPORT,
      { transferJobId },
      { ...DEFAULT_JOB_OPTIONS, jobId: `apply-${transferJobId}` }
    )
  }

  queueExport(transferJobId: string): Promise<unknown> {
    return this.queue.add(
      ProductTransferJobName.GENERATE_EXPORT,
      { transferJobId },
      { ...DEFAULT_JOB_OPTIONS, jobId: `export-${transferJobId}` }
    )
  }

  private async recoverQueuedJobs(): Promise<void> {
    const jobs = await this.transfers.queuedJobs()
    for (const job of jobs) {
      const id = job._id.toString()
      if (job.status === ProductTransferStatus.QUEUED_FOR_VALIDATION) {
        await this.queueValidation(id)
      } else if (job.status === ProductTransferStatus.QUEUED_FOR_IMPORT) {
        await this.queueImport(id)
      } else if (
        job.status === ProductTransferStatus.QUEUED &&
        job.type === ProductTransferType.EXPORT
      ) {
        await this.queueExport(id)
      }
    }
  }
}
