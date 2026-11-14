import { Injectable } from '@nestjs/common'
import {
  ConflictException,
  InvalidInputException,
} from '../../common/exceptions'
import { CreateProductImportUploadDto } from './dto/product-transfer.dto'
import { ProductStorageService } from './product-storage.service'
import { ProductTransferQueueService } from './product-transfer-queue.service'
import { ProductTransferService } from './product-transfer.service'
import {
  ProductTransferDownloadAuthorization,
  ProductTransferUploadAuthorization,
} from './product-transfer.types'
import {
  ProductTransferStatus,
  ProductTransferType,
} from './schemas/product-transfer-job.schema'

export enum ProductTransferArtifact {
  RESULT = 'RESULT',
  ERROR_REPORT = 'ERROR_REPORT',
}

@Injectable()
export class ProductTransferApiService {
  constructor(
    private readonly transfers: ProductTransferService,
    private readonly storage: ProductStorageService,
    private readonly queue: ProductTransferQueueService
  ) {}

  async createImportUpload(
    tenantId: string,
    requestedBy: string,
    input: CreateProductImportUploadDto
  ): Promise<ProductTransferUploadAuthorization> {
    if (!input.fileName.trim().toLocaleLowerCase('en-US').endsWith('.xlsx')) {
      throw new InvalidInputException('Select an .xlsx workbook.')
    }
    const job = await this.transfers.createImportJob(tenantId, requestedBy)
    try {
      const inputKey = job.inputKey
      if (!inputKey) {
        throw new ConflictException(
          'The import upload destination was not created.'
        )
      }
      const upload = await this.storage.createImportUpload(
        inputKey,
        job._id.toString()
      )
      return { job, ...upload }
    } catch (error) {
      await this.transfers.failJob(
        job._id.toString(),
        'Upload authorization could not be created.'
      )
      throw error
    }
  }

  async queueValidation(tenantId: string, jobId: string) {
    const existing = await this.transfers.getJob(tenantId, jobId)
    if (!existing.inputKey) {
      throw new ConflictException(
        'This import does not have an upload destination.'
      )
    }
    await this.storage.verifyImportSource(existing.inputKey, jobId)
    const job = await this.transfers.queueValidation(tenantId, jobId)
    try {
      await this.queue.queueValidation(jobId)
    } catch (error) {
      await this.transfers.failJob(
        jobId,
        'The validation job could not be queued.'
      )
      throw error
    }
    return job
  }

  async confirmImport(tenantId: string, jobId: string) {
    const job = await this.transfers.confirmImport(tenantId, jobId)
    try {
      await this.queue.queueImport(jobId)
    } catch (error) {
      await this.transfers.failJob(jobId, 'The import job could not be queued.')
      throw error
    }
    return job
  }

  cancelImport(tenantId: string, jobId: string) {
    return this.transfers.cancelImport(tenantId, jobId)
  }

  async createExport(tenantId: string, requestedBy: string) {
    const job = await this.transfers.createExportJob(tenantId, requestedBy)
    try {
      await this.queue.queueExport(job._id.toString())
    } catch (error) {
      await this.transfers.failJob(
        job._id.toString(),
        'The export job could not be queued.'
      )
      throw error
    }
    return job
  }

  async createDownloadUrl(
    tenantId: string,
    jobId: string,
    artifact: ProductTransferArtifact
  ): Promise<ProductTransferDownloadAuthorization> {
    const job = await this.transfers.getJob(tenantId, jobId)
    if (job.filesExpireAt && job.filesExpireAt.getTime() <= Date.now()) {
      throw new ConflictException('The downloadable file has expired.')
    }

    let key: string | undefined
    if (artifact === ProductTransferArtifact.ERROR_REPORT) {
      key = job.errorKey
    } else if (
      job.type === ProductTransferType.EXPORT &&
      [
        ProductTransferStatus.COMPLETED,
        ProductTransferStatus.COMPLETED_WITH_SKIPS,
      ].includes(job.status)
    ) {
      key = job.outputKey
    }
    if (!key) {
      throw new ConflictException(
        'The requested file is not available for download.'
      )
    }
    return this.storage.createDownloadUrl(key)
  }
}
