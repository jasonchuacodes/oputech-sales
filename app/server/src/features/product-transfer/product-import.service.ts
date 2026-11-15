import { Injectable } from '@nestjs/common'
import { InjectConnection } from '@nestjs/mongoose'
import { Job } from 'bullmq'
import { Connection, isValidObjectId } from 'mongoose'
import {
  ConflictException,
  InvalidInputException,
  NotFoundException,
} from '../../common/exceptions'
import { ProductService } from '../product/product.service'
import { ProductDocument } from '../product/schemas/product.schema'
import { StockService } from '../stock/stock.service'
import { canonicalizeStockUnit, normalizeStockUnit } from '../stock/stock-unit'
import { MAX_PRODUCT_TRANSFER_ROWS } from './product-transfer.constants'
import { ProductStorageService } from './product-storage.service'
import {
  ProductValidationSummary,
  ProductTransferService,
  StagedProductImportRow,
} from './product-transfer.service'
import {
  ParsedProductRow,
  ProductTransferQueuePayload,
  ProductTransferRowError,
} from './product-transfer.types'
import { normalizeProductName } from './product-transfer.utils'
import { ProductWorkbookService } from './product-workbook.service'
import {
  ProductImportRowAction,
  ProductImportRowDocument,
  ProductImportRowStatus,
} from './schemas/product-import-row.schema'

interface ValidationCandidate {
  parsed: ParsedProductRow
  product?: ProductDocument
  identity?: string
  unit?: string
  action: ProductImportRowAction
  errors: ProductTransferRowError[]
}

@Injectable()
export class ProductImportService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly transfers: ProductTransferService,
    private readonly products: ProductService,
    private readonly stock: StockService,
    private readonly storage: ProductStorageService,
    private readonly workbooks: ProductWorkbookService
  ) {}

  async validateImport(jobId: string): Promise<void> {
    const job = await this.transfers.beginValidation(jobId)
    try {
      if (!job.inputKey) {
        throw new InvalidInputException(
          'The import source workbook is missing.'
        )
      }
      const buffer = await this.storage.download(job.inputKey)
      const parsedRows = await this.workbooks.parseImport(buffer)
      const products = await this.products.listActiveForTransfer(
        job.tenantId,
        MAX_PRODUCT_TRANSFER_ROWS + 1
      )
      if (products.length > MAX_PRODUCT_TRANSFER_ROWS) {
        throw new InvalidInputException(
          `The active catalog exceeds the supported ${MAX_PRODUCT_TRANSFER_ROWS.toLocaleString()} products.`
        )
      }
      const candidates = await this.validateRows(
        job.tenantId,
        parsedRows,
        products
      )
      const errors = candidates.flatMap((candidate) => candidate.errors)
      let errorKey: string | undefined
      if (errors.length > 0) {
        errorKey = this.storage.importErrorKey(job.tenantId, jobId)
        await this.storage.upload(
          errorKey,
          await this.workbooks.createErrorWorkbook(errors)
        )
      }
      const summary = this.validationSummary(candidates, errorKey)
      const stagedRows = errors.length === 0 ? this.stageRows(candidates) : []
      await this.transfers.completeValidation(
        jobId,
        job.tenantId,
        stagedRows,
        summary
      )
    } catch (error) {
      if (error instanceof InvalidInputException) {
        await this.transfers.failValidation(jobId, error.message)
        return
      }
      throw error
    }
  }

  private async validateRows(
    tenantId: string,
    parsedRows: ParsedProductRow[],
    products: ProductDocument[]
  ): Promise<ValidationCandidate[]> {
    const byId = new Map(
      products.map((product) => [product._id.toString(), product])
    )
    const byName = new Map<string, ProductDocument[]>()
    for (const product of products) {
      const normalized = normalizeProductName(product.name)
      const matches = byName.get(normalized) ?? []
      matches.push(product)
      byName.set(normalized, matches)
    }
    const unitOptions = await this.stock.listUnitOptions(tenantId)
    const units = new Map(
      unitOptions.map(({ label }) => [normalizeStockUnit(label), label])
    )

    const candidates = parsedRows.map((parsed) => {
      const errors = [...parsed.errors]
      let product: ProductDocument | undefined
      if (parsed.productId) {
        if (!isValidObjectId(parsed.productId)) {
          errors.push(
            this.rowError(
              parsed,
              'Product ID',
              parsed.productId,
              'Product ID is invalid.'
            )
          )
        } else {
          product = byId.get(parsed.productId)
          if (!product) {
            errors.push(
              this.rowError(
                parsed,
                'Product ID',
                parsed.productId,
                'Product ID does not identify an active product in this tenant.'
              )
            )
          } else if (
            parsed.normalizedName &&
            normalizeProductName(product.name) !== parsed.normalizedName
          ) {
            errors.push(
              this.rowError(
                parsed,
                'Product Name',
                parsed.productName ?? '',
                'Product Name does not match the supplied Product ID.'
              )
            )
          }
        }
      } else if (parsed.normalizedName) {
        const matches = byName.get(parsed.normalizedName) ?? []
        if (matches.length > 1) {
          errors.push(
            this.rowError(
              parsed,
              'Product Name',
              parsed.productName ?? '',
              'Product Name matches multiple existing products.'
            )
          )
        } else {
          product = matches[0]
        }
      }

      if (!product && !parsed.productId && parsed.price === undefined) {
        errors.push(
          this.rowError(
            parsed,
            'Price',
            '',
            'Price is required when creating a product.'
          )
        )
      }

      let unit: string | undefined
      if (parsed.unit && parsed.quantity !== undefined) {
        const normalizedUnit = normalizeStockUnit(parsed.unit)
        if (product?.inventory) {
          if (normalizeStockUnit(product.inventory.unit) !== normalizedUnit) {
            errors.push(
              this.rowError(
                parsed,
                'Unit',
                parsed.unit,
                `Unit must match the existing product unit (${product.inventory.unit}).`
              )
            )
          } else {
            unit = product.inventory.unit
          }
        } else {
          unit = units.get(normalizedUnit) ?? canonicalizeStockUnit(parsed.unit)
        }
      }

      const action = !product
        ? ProductImportRowAction.CREATE
        : parsed.quantity === undefined
          ? ProductImportRowAction.UNCHANGED
          : product.inventory
            ? ProductImportRowAction.RECONCILE
            : ProductImportRowAction.ENABLE_STOCK
      return {
        parsed,
        product,
        identity: product
          ? `product-${product._id.toString()}`
          : parsed.normalizedName
            ? `new-${parsed.normalizedName}`
            : undefined,
        unit,
        action,
        errors,
      }
    })

    const byIdentity = new Map<string, ValidationCandidate[]>()
    for (const candidate of candidates) {
      if (!candidate.identity) continue
      const group = byIdentity.get(candidate.identity) ?? []
      group.push(candidate)
      byIdentity.set(candidate.identity, group)
    }
    for (const group of byIdentity.values()) {
      if (group.length < 2) continue
      for (const candidate of group) {
        candidate.errors.push(
          this.rowError(
            candidate.parsed,
            candidate.parsed.productId ? 'Product ID' : 'Product Name',
            candidate.parsed.productId ?? candidate.parsed.productName ?? '',
            'This product appears more than once in the workbook.'
          )
        )
      }
    }
    return candidates
  }

  private stageRows(
    candidates: ValidationCandidate[]
  ): StagedProductImportRow[] {
    return candidates.map((candidate) => ({
      rowNumber: candidate.parsed.rowNumber,
      productId: candidate.product?._id.toString(),
      productName:
        candidate.product?.name ??
        candidate.parsed.productName ??
        `[Missing product name at row ${candidate.parsed.rowNumber}]`,
      normalizedName:
        candidate.product !== undefined
          ? normalizeProductName(candidate.product.name)
          : (candidate.parsed.normalizedName ??
            `missing-product-name-row-${candidate.parsed.rowNumber}`),
      price: candidate.parsed.price,
      unit:
        candidate.unit ??
        (candidate.parsed.unit
          ? canonicalizeStockUnit(candidate.parsed.unit)
          : undefined),
      quantity: candidate.parsed.quantity,
      action: candidate.action,
      status: ProductImportRowStatus.PENDING,
    }))
  }

  private validationSummary(
    candidates: ValidationCandidate[],
    errorKey?: string
  ): ProductValidationSummary {
    const eligible = candidates.filter(
      (candidate) => candidate.errors.length === 0
    )
    const allEligible = eligible.length === candidates.length
    return {
      totalRows: candidates.length,
      eligibleRows: eligible.length,
      skippedRows: candidates.length - eligible.length,
      createdCount: allEligible
        ? eligible.filter(
            (candidate) => candidate.action === ProductImportRowAction.CREATE
          ).length
        : 0,
      updatedCount: allEligible
        ? eligible.filter((candidate) =>
            [
              ProductImportRowAction.ENABLE_STOCK,
              ProductImportRowAction.RECONCILE,
            ].includes(candidate.action)
          ).length
        : 0,
      unchangedCount: allEligible
        ? eligible.filter(
            (candidate) => candidate.action === ProductImportRowAction.UNCHANGED
          ).length
        : 0,
      errorKey,
    }
  }

  async applyImport(
    jobId: string,
    queueJob: Job<ProductTransferQueuePayload>
  ): Promise<void> {
    const job = await this.transfers.beginImport(jobId)
    while (true) {
      const rows = await this.transfers.listPendingRows(jobId)
      if (rows.length === 0) break
      for (const row of rows) {
        await this.applyRow(job, row)
      }
      const refreshed = await this.transfers.getJobById(jobId)
      await queueJob.updateProgress({
        appliedRows: refreshed.appliedRows,
        totalRows: refreshed.eligibleRows + refreshed.skippedRows,
      })
    }

    const skipped = await this.transfers.listSkippedRows(jobId)
    if (skipped.length > 0) {
      const errorKey = this.storage.importErrorKey(job.tenantId, jobId)
      await this.storage.upload(
        errorKey,
        await this.workbooks.createErrorWorkbook(
          skipped.map((row) => ({
            rowNumber: row.rowNumber,
            column: 'Row',
            submittedValue: row.productName,
            message: row.skipReason ?? 'The row was skipped.',
          }))
        )
      )
      await this.transfers.setErrorKey(jobId, errorKey)
    }
    await this.transfers.completeImport(jobId)
  }

  private async applyRow(
    job: Awaited<ReturnType<ProductTransferService['getJobById']>>,
    inputRow: ProductImportRowDocument
  ): Promise<void> {
    const session = await this.connection.startSession()
    try {
      try {
        await session.withTransaction(async () => {
          const row = await this.transfers.findRowForUpdate(
            inputRow._id.toString(),
            session
          )
          if (!row || row.status !== ProductImportRowStatus.PENDING) return
          let product: ProductDocument | null
          if (row.action === ProductImportRowAction.CREATE) {
            if (row.price === undefined) {
              throw new InvalidInputException(
                'Price is required to create the product.'
              )
            }
            product = await this.products.createForImport(
              job.tenantId,
              { name: row.productName, price: row.price },
              session
            )
          } else {
            product = row.productId
              ? await this.products.findActiveForImport(
                  job.tenantId,
                  row.productId,
                  session
                )
              : null
            if (!product) {
              throw new NotFoundException(
                'The matching product is no longer available.'
              )
            }
          }

          if (row.unit && row.quantity !== undefined) {
            await this.stock.applySpreadsheetImport(
              job.tenantId,
              product,
              row.unit,
              row.quantity,
              job.requestedBy,
              `${job._id.toString()}-${row.rowNumber}`,
              new Date(),
              session
            )
          }
          await this.transfers.markRowApplied(
            row._id.toString(),
            job._id.toString(),
            session
          )
        })
      } catch (error) {
        if (
          error instanceof ConflictException ||
          error instanceof InvalidInputException ||
          error instanceof NotFoundException
        ) {
          await session.withTransaction(async () => {
            await this.transfers.markRowSkipped(
              inputRow._id.toString(),
              job._id.toString(),
              inputRow.action,
              error.message,
              session
            )
          })
          return
        }
        throw error
      }
    } finally {
      await session.endSession()
    }
  }

  private rowError(
    row: ParsedProductRow,
    column: string,
    submittedValue: string,
    message: string
  ): ProductTransferRowError {
    return { rowNumber: row.rowNumber, column, submittedValue, message }
  }
}
