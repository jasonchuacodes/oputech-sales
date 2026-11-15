import { describe, expect, it, vi } from 'vitest'
import { InvalidInputException } from '../../src/common/exceptions'
import { ProductImportService } from '../../src/features/product-transfer/product-import.service'
import { ProductTransferService } from '../../src/features/product-transfer/product-transfer.service'
import {
  ProductImportRowAction,
  ProductImportRowStatus,
} from '../../src/features/product-transfer/schemas/product-import-row.schema'
import { ProductTransferStatus } from '../../src/features/product-transfer/schemas/product-transfer-job.schema'

vi.mock('../../src/features/product/schemas/product.schema', () => ({
  Product: class Product {},
}))
vi.mock(
  '../../src/features/product-transfer/schemas/product-import-row.schema',
  () => ({
    ProductImportRow: class ProductImportRow {},
    ProductImportRowAction: {
      CREATE: 'CREATE',
      ENABLE_STOCK: 'ENABLE_STOCK',
      RECONCILE: 'RECONCILE',
      UNCHANGED: 'UNCHANGED',
    },
    ProductImportRowStatus: {
      PENDING: 'PENDING',
      APPLIED: 'APPLIED',
      SKIPPED: 'SKIPPED',
    },
  })
)
vi.mock(
  '../../src/features/product-transfer/schemas/product-transfer-job.schema',
  () => ({
    ProductTransferJob: class ProductTransferJob {},
    ProductTransferStatus: {
      AWAITING_UPLOAD: 'AWAITING_UPLOAD',
      QUEUED_FOR_VALIDATION: 'QUEUED_FOR_VALIDATION',
      VALIDATING: 'VALIDATING',
      AWAITING_CONFIRMATION: 'AWAITING_CONFIRMATION',
      QUEUED_FOR_IMPORT: 'QUEUED_FOR_IMPORT',
      IMPORTING: 'IMPORTING',
      VALIDATION_FAILED: 'VALIDATION_FAILED',
    },
    ProductTransferType: { IMPORT: 'IMPORT', EXPORT: 'EXPORT' },
  })
)

const objectId = (value: string) => ({ toString: () => value })

const makeValidationService = (parsedRows: object[]) => {
  const transfers = {
    beginValidation: vi.fn().mockResolvedValue({
      tenantId: 'tenant-1',
      inputKey: 'source.xlsx',
    }),
    completeValidation: vi.fn().mockResolvedValue(undefined),
    failValidation: vi.fn().mockResolvedValue(undefined),
  }
  const storage = {
    download: vi.fn().mockResolvedValue(Buffer.from('workbook')),
    importErrorKey: vi.fn().mockReturnValue('errors.xlsx'),
    upload: vi.fn().mockResolvedValue(undefined),
  }
  const workbooks = {
    parseImport: vi.fn().mockResolvedValue(parsedRows),
    createErrorWorkbook: vi.fn().mockResolvedValue(Buffer.from('errors')),
  }
  const products = {
    listActiveForTransfer: vi.fn().mockResolvedValue([]),
  }
  const stock = {
    listUnitOptions: vi.fn().mockResolvedValue([]),
  }
  const service = new ProductImportService(
    {} as never,
    transfers as never,
    products as never,
    stock as never,
    storage as never,
    workbooks as never
  )
  return { service, storage, transfers }
}

describe('product import validation and application flow', () => {
  it('stores an invalid validation result without inserting staged rows', async () => {
    const jobModel = {
      findOneAndUpdate: vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue({
          status: ProductTransferStatus.VALIDATION_FAILED,
        }),
      }),
    }
    const rowModel = { insertMany: vi.fn() }
    const service = new ProductTransferService(
      jobModel as never,
      rowModel as never
    )

    await service.completeValidation('job-1', 'tenant-1', [], {
      totalRows: 2,
      eligibleRows: 1,
      skippedRows: 1,
      createdCount: 0,
      updatedCount: 0,
      unchangedCount: 0,
      errorKey: 'errors.xlsx',
    })

    expect(rowModel.insertMany).not.toHaveBeenCalled()
    expect(jobModel.findOneAndUpdate.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        $set: expect.objectContaining({
          status: ProductTransferStatus.VALIDATION_FAILED,
          active: false,
          failureCode: 'INVALID_WORKBOOK',
          errorKey: 'errors.xlsx',
        }),
      })
    )
  })

  it('fails mixed-validity workbooks without staging any rows', async () => {
    const { service, storage, transfers } = makeValidationService([
      {
        rowNumber: 2,
        productName: 'Valid Product',
        normalizedName: 'valid product',
        price: 0,
        unit: 'Custom Case',
        quantity: '0',
        errors: [],
      },
      {
        rowNumber: 3,
        errors: [
          {
            rowNumber: 3,
            column: 'Product Name',
            submittedValue: '',
            message: 'Product Name is required.',
          },
        ],
      },
    ])

    await service.validateImport('job-1')

    expect(storage.upload).toHaveBeenCalledWith(
      'errors.xlsx',
      expect.any(Buffer)
    )
    expect(transfers.completeValidation).toHaveBeenCalledWith(
      'job-1',
      'tenant-1',
      [],
      expect.objectContaining({
        totalRows: 2,
        eligibleRows: 1,
        skippedRows: 1,
        createdCount: 0,
        errorKey: 'errors.xlsx',
      })
    )
  })

  it('stages every row when the complete workbook is eligible', async () => {
    const { service, storage, transfers } = makeValidationService([
      {
        rowNumber: 2,
        productName: 'Imported Product',
        normalizedName: 'imported product',
        price: 0,
        unit: 'Custom Case',
        quantity: '0',
        errors: [],
      },
    ])

    await service.validateImport('job-1')

    expect(storage.upload).not.toHaveBeenCalled()
    expect(transfers.completeValidation).toHaveBeenCalledWith(
      'job-1',
      'tenant-1',
      [
        expect.objectContaining({
          productName: 'Imported Product',
          unit: 'Custom Case',
          status: ProductImportRowStatus.PENDING,
          action: ProductImportRowAction.CREATE,
        }),
      ],
      expect.objectContaining({
        totalRows: 1,
        eligibleRows: 1,
        skippedRows: 0,
        createdCount: 1,
      })
    )
  })

  it('aborts a failed row transaction before recording the skip', async () => {
    const transactionEvents: string[] = []
    const session = {
      withTransaction: vi.fn(async (operation: () => Promise<void>) => {
        transactionEvents.push('transaction-started')
        try {
          await operation()
          transactionEvents.push('transaction-committed')
        } catch (error) {
          transactionEvents.push('transaction-aborted')
          throw error
        }
      }),
      endSession: vi.fn(),
    }
    const row = {
      _id: objectId('row-1'),
      rowNumber: 2,
      productName: 'Imported Product',
      normalizedName: 'imported product',
      price: 0,
      unit: 'Case',
      quantity: '0',
      action: ProductImportRowAction.CREATE,
      status: ProductImportRowStatus.PENDING,
    }
    const transfers = {
      beginImport: vi.fn().mockResolvedValue({
        _id: objectId('job-1'),
        tenantId: 'tenant-1',
        requestedBy: 'user-1',
      }),
      listPendingRows: vi
        .fn()
        .mockResolvedValueOnce([row])
        .mockResolvedValueOnce([]),
      findRowForUpdate: vi.fn().mockResolvedValue(row),
      markRowApplied: vi.fn(),
      markRowSkipped: vi.fn(async () => {
        transactionEvents.push('row-skipped')
      }),
      getJobById: vi.fn().mockResolvedValue({
        appliedRows: 0,
        eligibleRows: 0,
        skippedRows: 1,
      }),
      listSkippedRows: vi.fn().mockResolvedValue([]),
      completeImport: vi.fn().mockResolvedValue(undefined),
    }
    const products = {
      createForImport: vi
        .fn()
        .mockResolvedValue({ _id: objectId('product-1') }),
    }
    const stock = {
      applySpreadsheetImport: vi
        .fn()
        .mockRejectedValue(
          new InvalidInputException('Invalid imported stock.')
        ),
    }
    const service = new ProductImportService(
      { startSession: vi.fn().mockResolvedValue(session) } as never,
      transfers as never,
      products as never,
      stock as never,
      {} as never,
      {} as never
    )

    await service.applyImport('job-1', { updateProgress: vi.fn() } as never)

    expect(transactionEvents).toEqual([
      'transaction-started',
      'transaction-aborted',
      'transaction-started',
      'row-skipped',
      'transaction-committed',
    ])
    expect(transfers.markRowApplied).not.toHaveBeenCalled()
    expect(session.endSession).toHaveBeenCalled()
  })
})
