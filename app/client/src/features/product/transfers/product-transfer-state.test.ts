import { describe, expect, it } from 'vitest'
import {
  ProductTransferStatus,
  ProductTransferType,
  type ProductTransferJob,
} from '@/services/product-transfer/product-transfer.types'
import {
  canCancelImport,
  transferProgress,
  transferProgressDetail,
  transferStatusLabel,
} from './product-transfer-state'

const job = (
  overrides: Partial<ProductTransferJob> = {}
): ProductTransferJob => ({
  id: 'job-1',
  type: ProductTransferType.Import,
  status: ProductTransferStatus.Importing,
  totalRows: 100,
  eligibleRows: 80,
  skippedRows: 20,
  validatedRows: 100,
  appliedRows: 40,
  createdCount: 10,
  updatedCount: 20,
  unchangedCount: 10,
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
})

describe('product transfer UI state', () => {
  it('maps import progress to applied rows', () => {
    const transfer = job()
    expect(transferProgress(transfer, 0)).toBe(50)
    expect(transferProgressDetail(transfer, 0)).toBe('40 of 80 rows')
    expect(transferStatusLabel(transfer)).toBe('Importing products')
  })

  it('maps upload byte progress', () => {
    const transfer = job({
      status: ProductTransferStatus.AwaitingUpload,
      appliedRows: 0,
    })
    expect(transferProgress(transfer, 72)).toBe(72)
    expect(transferProgressDetail(transfer, 72)).toBe('72% uploaded')
  })

  it('only offers cancellation before application starts', () => {
    expect(
      canCancelImport(
        job({ status: ProductTransferStatus.AwaitingConfirmation })
      )
    ).toBe(true)
    expect(canCancelImport(job())).toBe(false)
    expect(
      canCancelImport(
        job({
          type: ProductTransferType.Export,
          status: ProductTransferStatus.Exporting,
        })
      )
    ).toBe(false)
  })

  it('describes completed exports', () => {
    const transfer = job({
      type: ProductTransferType.Export,
      status: ProductTransferStatus.Completed,
      totalRows: 12,
      eligibleRows: 0,
      skippedRows: 0,
      appliedRows: 0,
    })
    expect(transferStatusLabel(transfer)).toBe('Export ready')
    expect(transferProgressDetail(transfer, 0)).toBe('12 products')
  })
})
