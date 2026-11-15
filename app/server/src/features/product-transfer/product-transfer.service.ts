import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { ClientSession, isValidObjectId, Model } from 'mongoose'
import {
  ConflictException,
  InvalidInputException,
  NotFoundException,
} from '../../common/exceptions'
import {
  ProductImportRow,
  ProductImportRowAction,
  ProductImportRowDocument,
  ProductImportRowStatus,
} from './schemas/product-import-row.schema'
import {
  ProductTransferJob,
  ProductTransferJobDocument,
  ProductTransferStatus,
  ProductTransferType,
} from './schemas/product-transfer-job.schema'
import { isDuplicateKeyError } from './product-transfer.utils'
import {
  PRODUCT_TRANSFER_FILE_TTL_DAYS,
  PRODUCT_TRANSFER_STAGING_TTL_DAYS,
  PRODUCT_TRANSFER_UPLOAD_TTL_SECONDS,
} from './product-transfer.constants'

export interface StagedProductImportRow {
  rowNumber: number
  productId?: string
  productName: string
  normalizedName: string
  price?: number
  unit?: string
  quantity?: string
  action: ProductImportRowAction
  status: ProductImportRowStatus
  skipReason?: string
}

export interface ProductValidationSummary {
  totalRows: number
  eligibleRows: number
  skippedRows: number
  createdCount: number
  updatedCount: number
  unchangedCount: number
  errorKey?: string
}

@Injectable()
export class ProductTransferService {
  constructor(
    @InjectModel(ProductTransferJob.name)
    private readonly jobModel: Model<ProductTransferJobDocument>,
    @InjectModel(ProductImportRow.name)
    private readonly rowModel: Model<ProductImportRowDocument>
  ) {}

  async createImportJob(
    tenantId: string,
    requestedBy: string
  ): Promise<ProductTransferJobDocument> {
    await this.expireInactiveJobs(tenantId)
    const job = new this.jobModel({
      tenantId,
      requestedBy,
      type: ProductTransferType.IMPORT,
      status: ProductTransferStatus.AWAITING_UPLOAD,
      active: true,
    })
    job.inputKey = `tenants/${tenantId}/product-imports/${job._id.toString()}/source.xlsx`
    return this.saveNewJob(job)
  }

  async createExportJob(
    tenantId: string,
    requestedBy: string
  ): Promise<ProductTransferJobDocument> {
    await this.expireInactiveJobs(tenantId)
    const job = new this.jobModel({
      tenantId,
      requestedBy,
      type: ProductTransferType.EXPORT,
      status: ProductTransferStatus.QUEUED,
      active: true,
    })
    job.outputKey = `tenants/${tenantId}/product-exports/${job._id.toString()}/products.xlsx`
    return this.saveNewJob(job)
  }

  getJob(tenantId: string, jobId: string): Promise<ProductTransferJobDocument> {
    this.assertJobId(jobId)
    return this.requireJob({ _id: jobId, tenantId })
  }

  async getJobById(jobId: string): Promise<ProductTransferJobDocument> {
    this.assertJobId(jobId)
    return this.requireJob({ _id: jobId })
  }

  async activeJob(
    tenantId: string
  ): Promise<ProductTransferJobDocument | null> {
    await this.expireInactiveJobs(tenantId)
    return this.jobModel
      .findOne({ tenantId, active: true })
      .sort({ createdAt: -1 })
      .exec()
  }

  latestJob(tenantId: string): Promise<ProductTransferJobDocument | null> {
    return this.jobModel.findOne({ tenantId }).sort({ createdAt: -1 }).exec()
  }

  async queueValidation(
    tenantId: string,
    jobId: string
  ): Promise<ProductTransferJobDocument> {
    this.assertJobId(jobId)
    const job = await this.jobModel
      .findOneAndUpdate(
        {
          _id: jobId,
          tenantId,
          type: ProductTransferType.IMPORT,
          status: ProductTransferStatus.AWAITING_UPLOAD,
          active: true,
        },
        { $set: { status: ProductTransferStatus.QUEUED_FOR_VALIDATION } },
        { returnDocument: 'after' }
      )
      .exec()
    if (job) return job
    throw new ConflictException(
      'This import is not awaiting workbook validation.'
    )
  }

  async confirmImport(
    tenantId: string,
    jobId: string
  ): Promise<ProductTransferJobDocument> {
    this.assertJobId(jobId)
    const job = await this.jobModel
      .findOneAndUpdate(
        {
          _id: jobId,
          tenantId,
          type: ProductTransferType.IMPORT,
          status: ProductTransferStatus.AWAITING_CONFIRMATION,
          eligibleRows: { $gt: 0 },
          skippedRows: 0,
          $expr: {
            $and: [
              { $eq: ['$eligibleRows', '$totalRows'] },
              { $eq: ['$validatedRows', '$totalRows'] },
            ],
          },
          active: true,
        },
        { $set: { status: ProductTransferStatus.QUEUED_FOR_IMPORT } },
        { returnDocument: 'after' }
      )
      .exec()
    if (job) return job
    throw new ConflictException('This import is not ready for confirmation.')
  }

  async cancelImport(
    tenantId: string,
    jobId: string
  ): Promise<ProductTransferJobDocument> {
    this.assertJobId(jobId)
    const job = await this.jobModel
      .findOneAndUpdate(
        {
          _id: jobId,
          tenantId,
          type: ProductTransferType.IMPORT,
          status: {
            $in: [
              ProductTransferStatus.AWAITING_UPLOAD,
              ProductTransferStatus.QUEUED_FOR_VALIDATION,
              ProductTransferStatus.VALIDATING,
              ProductTransferStatus.AWAITING_CONFIRMATION,
              ProductTransferStatus.QUEUED_FOR_IMPORT,
            ],
          },
          active: true,
        },
        {
          $set: {
            status: ProductTransferStatus.CANCELLED,
            active: false,
            completedAt: new Date(),
            filesExpireAt: new Date(
              Date.now() + PRODUCT_TRANSFER_FILE_TTL_DAYS * 24 * 60 * 60 * 1000
            ),
          },
        },
        { returnDocument: 'after' }
      )
      .exec()
    if (job) return job
    throw new ConflictException('This import can no longer be cancelled.')
  }

  async beginValidation(jobId: string): Promise<ProductTransferJobDocument> {
    const job = await this.jobModel
      .findOneAndUpdate(
        {
          _id: jobId,
          type: ProductTransferType.IMPORT,
          status: {
            $in: [
              ProductTransferStatus.QUEUED_FOR_VALIDATION,
              ProductTransferStatus.VALIDATING,
            ],
          },
          active: true,
        },
        {
          $set: {
            status: ProductTransferStatus.VALIDATING,
            startedAt: new Date(),
            failureCode: null,
            failureMessage: null,
          },
        },
        { returnDocument: 'after' }
      )
      .exec()
    if (!job)
      throw new ConflictException('The import is not queued for validation.')
    await this.rowModel.deleteMany({ jobId }).exec()
    return job
  }

  async completeValidation(
    jobId: string,
    tenantId: string,
    rows: StagedProductImportRow[],
    summary: ProductValidationSummary
  ): Promise<ProductTransferJobDocument> {
    const allRowsEligible =
      summary.totalRows > 0 &&
      summary.eligibleRows === summary.totalRows &&
      summary.skippedRows === 0 &&
      rows.length === summary.totalRows &&
      rows.every((row) => row.status === ProductImportRowStatus.PENDING)
    if (allRowsEligible) {
      const expiresAt = new Date(
        Date.now() + PRODUCT_TRANSFER_STAGING_TTL_DAYS * 24 * 60 * 60 * 1000
      )
      await this.rowModel.insertMany(
        rows.map((row) => ({ ...row, jobId, tenantId, expiresAt })),
        { ordered: true }
      )
    }
    const job = await this.jobModel
      .findOneAndUpdate(
        { _id: jobId, status: ProductTransferStatus.VALIDATING, active: true },
        {
          $set: {
            ...summary,
            validatedRows: summary.totalRows,
            status: allRowsEligible
              ? ProductTransferStatus.AWAITING_CONFIRMATION
              : ProductTransferStatus.VALIDATION_FAILED,
            active: allRowsEligible,
            completedAt: allRowsEligible ? null : new Date(),
            filesExpireAt: new Date(
              Date.now() + PRODUCT_TRANSFER_FILE_TTL_DAYS * 24 * 60 * 60 * 1000
            ),
            failureCode: allRowsEligible ? null : 'INVALID_WORKBOOK',
            failureMessage: allRowsEligible
              ? null
              : 'Every product row must pass validation. Fix the reported errors and upload the workbook again. Nothing was imported.',
          },
        },
        { returnDocument: 'after' }
      )
      .exec()
    if (!job)
      throw new ConflictException('The validation result could not be saved.')
    return job
  }

  async failValidation(jobId: string, message: string): Promise<void> {
    await this.jobModel
      .updateOne(
        { _id: jobId, active: true },
        {
          $set: {
            status: ProductTransferStatus.VALIDATION_FAILED,
            active: false,
            completedAt: new Date(),
            failureCode: 'INVALID_WORKBOOK',
            failureMessage: message,
          },
        }
      )
      .exec()
  }

  async beginImport(jobId: string): Promise<ProductTransferJobDocument> {
    const job = await this.jobModel
      .findOneAndUpdate(
        {
          _id: jobId,
          type: ProductTransferType.IMPORT,
          status: {
            $in: [
              ProductTransferStatus.QUEUED_FOR_IMPORT,
              ProductTransferStatus.IMPORTING,
            ],
          },
          active: true,
        },
        {
          $set: {
            status: ProductTransferStatus.IMPORTING,
            startedAt: new Date(),
          },
        },
        { returnDocument: 'after' }
      )
      .exec()
    if (!job)
      throw new ConflictException('The import is not queued for application.')
    return job
  }

  listPendingRows(
    jobId: string,
    limit = 100
  ): Promise<ProductImportRowDocument[]> {
    return this.rowModel
      .find({ jobId, status: ProductImportRowStatus.PENDING })
      .sort({ rowNumber: 1 })
      .limit(limit)
      .exec()
  }

  async findRowForUpdate(
    rowId: string,
    session: ClientSession
  ): Promise<ProductImportRowDocument | null> {
    return this.rowModel.findById(rowId).session(session).exec()
  }

  async markRowApplied(
    rowId: string,
    jobId: string,
    session: ClientSession
  ): Promise<void> {
    const result = await this.rowModel
      .updateOne(
        { _id: rowId, status: ProductImportRowStatus.PENDING },
        { $set: { status: ProductImportRowStatus.APPLIED } },
        { session }
      )
      .exec()
    if (result.modifiedCount === 0) return
    await this.jobModel
      .updateOne({ _id: jobId }, { $inc: { appliedRows: 1 } }, { session })
      .exec()
  }

  async markRowSkipped(
    rowId: string,
    jobId: string,
    action: ProductImportRowAction,
    reason: string,
    session: ClientSession
  ): Promise<void> {
    const result = await this.rowModel
      .updateOne(
        { _id: rowId, status: ProductImportRowStatus.PENDING },
        {
          $set: { status: ProductImportRowStatus.SKIPPED, skipReason: reason },
        },
        { session }
      )
      .exec()
    if (result.modifiedCount === 0) return
    const countField =
      action === ProductImportRowAction.CREATE
        ? 'createdCount'
        : action === ProductImportRowAction.UNCHANGED
          ? 'unchangedCount'
          : 'updatedCount'
    await this.jobModel
      .updateOne(
        { _id: jobId },
        {
          $inc: {
            skippedRows: 1,
            eligibleRows: -1,
            [countField]: -1,
          },
        },
        { session }
      )
      .exec()
  }

  listSkippedRows(jobId: string): Promise<ProductImportRowDocument[]> {
    return this.rowModel
      .find({ jobId, status: ProductImportRowStatus.SKIPPED })
      .sort({ rowNumber: 1 })
      .exec()
  }

  async setErrorKey(jobId: string, errorKey: string): Promise<void> {
    await this.jobModel.updateOne({ _id: jobId }, { $set: { errorKey } }).exec()
  }

  async completeImport(jobId: string): Promise<void> {
    const job = await this.jobModel.findById(jobId).exec()
    if (!job) return
    await this.jobModel
      .updateOne(
        { _id: jobId, status: ProductTransferStatus.IMPORTING },
        {
          $set: {
            status:
              job.skippedRows > 0
                ? ProductTransferStatus.COMPLETED_WITH_SKIPS
                : ProductTransferStatus.COMPLETED,
            active: false,
            completedAt: new Date(),
          },
        }
      )
      .exec()
  }

  async beginExport(jobId: string): Promise<ProductTransferJobDocument> {
    const job = await this.jobModel
      .findOneAndUpdate(
        {
          _id: jobId,
          type: ProductTransferType.EXPORT,
          status: {
            $in: [
              ProductTransferStatus.QUEUED,
              ProductTransferStatus.EXPORTING,
            ],
          },
          active: true,
        },
        {
          $set: {
            status: ProductTransferStatus.EXPORTING,
            startedAt: new Date(),
          },
        },
        { returnDocument: 'after' }
      )
      .exec()
    if (!job)
      throw new ConflictException('The export is not queued for generation.')
    return job
  }

  async completeExport(jobId: string, totalRows: number): Promise<void> {
    await this.jobModel
      .updateOne(
        { _id: jobId, status: ProductTransferStatus.EXPORTING },
        {
          $set: {
            totalRows,
            eligibleRows: totalRows,
            status: ProductTransferStatus.COMPLETED,
            active: false,
            completedAt: new Date(),
            filesExpireAt: new Date(
              Date.now() + PRODUCT_TRANSFER_FILE_TTL_DAYS * 24 * 60 * 60 * 1000
            ),
          },
        }
      )
      .exec()
  }

  async failJob(jobId: string, message: string): Promise<void> {
    await this.jobModel
      .updateOne(
        { _id: jobId, active: true },
        {
          $set: {
            status: ProductTransferStatus.FAILED,
            active: false,
            completedAt: new Date(),
            failureCode: 'PROCESSING_FAILED',
            failureMessage: message,
          },
        }
      )
      .exec()
  }

  queuedJobs(): Promise<ProductTransferJobDocument[]> {
    const staleBefore = new Date(Date.now() - 15 * 60 * 1000)
    return this.resetAndListQueuedJobs(staleBefore)
  }

  private async resetAndListQueuedJobs(
    staleBefore: Date
  ): Promise<ProductTransferJobDocument[]> {
    await Promise.all([
      this.jobModel.updateMany(
        {
          active: true,
          status: ProductTransferStatus.VALIDATING,
          updatedAt: { $lt: staleBefore },
        },
        { $set: { status: ProductTransferStatus.QUEUED_FOR_VALIDATION } }
      ),
      this.jobModel.updateMany(
        {
          active: true,
          status: ProductTransferStatus.IMPORTING,
          updatedAt: { $lt: staleBefore },
        },
        { $set: { status: ProductTransferStatus.QUEUED_FOR_IMPORT } }
      ),
      this.jobModel.updateMany(
        {
          active: true,
          status: ProductTransferStatus.EXPORTING,
          updatedAt: { $lt: staleBefore },
        },
        { $set: { status: ProductTransferStatus.QUEUED } }
      ),
    ])
    return this.jobModel
      .find({
        active: true,
        status: {
          $in: [
            ProductTransferStatus.QUEUED_FOR_VALIDATION,
            ProductTransferStatus.QUEUED_FOR_IMPORT,
            ProductTransferStatus.QUEUED,
          ],
        },
      })
      .sort({ createdAt: 1 })
      .exec()
  }

  private async saveNewJob(
    job: ProductTransferJobDocument
  ): Promise<ProductTransferJobDocument> {
    try {
      return await job.save()
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new ConflictException(
          'Finish or cancel the active product transfer before starting another one.'
        )
      }
      throw error
    }
  }

  private async expireInactiveJobs(tenantId: string): Promise<void> {
    const now = new Date()
    const uploadExpiredBefore = new Date(
      now.getTime() - (PRODUCT_TRANSFER_UPLOAD_TTL_SECONDS + 5 * 60) * 1000
    )
    await this.jobModel
      .updateMany(
        {
          tenantId,
          active: true,
          $or: [
            {
              status: ProductTransferStatus.AWAITING_UPLOAD,
              createdAt: { $lte: uploadExpiredBefore },
            },
            {
              status: ProductTransferStatus.AWAITING_CONFIRMATION,
              filesExpireAt: { $lte: now },
            },
          ],
        },
        {
          $set: {
            status: ProductTransferStatus.EXPIRED,
            active: false,
            completedAt: now,
          },
        }
      )
      .exec()
  }

  private async requireJob(filter: {
    _id: string
    tenantId?: string
  }): Promise<ProductTransferJobDocument> {
    const job = await this.jobModel.findOne(filter).exec()
    if (!job)
      throw new NotFoundException('The product transfer job was not found.')
    return job
  }

  private assertJobId(jobId: string): void {
    if (!isValidObjectId(jobId)) {
      throw new InvalidInputException(
        'A valid product transfer job is required.'
      )
    }
  }
}
