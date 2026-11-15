import { Types } from 'mongoose'
import { describe, expect, it, vi } from 'vitest'
import {
  StockMovementReason,
  StockMovementSourceType,
} from './schemas/stock-movement.schema'
import { StockService } from './stock.service'

vi.mock('../product/schemas/product.schema', () => ({
  Product: class Product {},
}))

vi.mock('./schemas/stock-movement.schema', () => ({
  StockMovement: class StockMovement {},
  StockMovementReason: {
    OPENING: 'OPENING',
    RECEIPT: 'RECEIPT',
    SALE: 'SALE',
    VOID: 'VOID',
    CORRECTION: 'CORRECTION',
    SPREADSHEET_IMPORT: 'SPREADSHEET_IMPORT',
  },
  StockMovementSourceType: {
    TRANSACTION: 'TRANSACTION',
    STOCK_OPERATION: 'STOCK_OPERATION',
    PRODUCT_IMPORT: 'PRODUCT_IMPORT',
  },
}))

const PRODUCT_ID = '507f1f77bcf86cd799439011'

const queryResult = <T>(value: T) => {
  const query = {
    exec: vi.fn().mockResolvedValue(value),
    session: vi.fn(),
  }
  query.session.mockReturnValue(query)
  return query
}

const makeConnection = () => ({
  startSession: vi.fn().mockResolvedValue({
    withTransaction: vi.fn(async (operation) => operation()),
    endSession: vi.fn(),
  }),
})

const makeTenantService = () => ({
  resolveStockUnit: vi.fn().mockResolvedValue('Box'),
  addStockUnit: vi
    .fn()
    .mockImplementation(async (_tenantId, label) => ({ label })),
})

const inventoryProduct = (stockCount: string, revision: number) => ({
  _id: { toString: () => PRODUCT_ID },
  tenantId: 'tenant-1',
  name: 'Engine Oil 1L',
  inventory: {
    stockCount: Types.Decimal128.fromString(stockCount),
    unit: 'pc',
    revision,
  },
})

describe('StockService embedded inventory', () => {
  it('uses the canonical tenant unit when enabling stock tracking', async () => {
    const current = {
      _id: { toString: () => PRODUCT_ID },
      tenantId: 'tenant-1',
      name: 'Filters',
    }
    const updated = inventoryProduct('4', 1)
    const movementModel = {
      findOne: vi.fn().mockReturnValue(queryResult(null)),
      create: vi.fn().mockResolvedValue([]),
    }
    const productModel = {
      findOne: vi.fn().mockReturnValue(queryResult(current)),
      findOneAndUpdate: vi.fn().mockReturnValue(queryResult(updated)),
    }
    const tenantService = makeTenantService()
    const service = new StockService(
      makeConnection() as never,
      movementModel as never,
      productModel as never,
      tenantService as never
    )

    await service.enableTracking(
      'tenant-1',
      {
        clientMutationId: 'setup-1',
        productId: PRODUCT_ID,
        unit: 'box',
        openingQuantity: '4',
      },
      'user-1'
    )

    expect(tenantService.resolveStockUnit).toHaveBeenCalledWith(
      'tenant-1',
      'box'
    )
    expect(productModel.findOneAndUpdate.mock.calls[0][1]).toEqual({
      $set: {
        inventory: {
          stockCount: expect.any(Types.Decimal128),
          unit: 'Box',
          revision: 1,
        },
      },
    })
    expect(movementModel.create.mock.calls[0][0][0].unit).toBe('Box')
  })

  it('updates the product and records before and after balances for a receipt', async () => {
    const current = inventoryProduct('10', 3)
    const updated = inventoryProduct('16', 4)
    const movementModel = {
      findOne: vi.fn().mockReturnValue(queryResult(null)),
      create: vi.fn().mockResolvedValue([]),
    }
    const productModel = {
      findOne: vi.fn().mockReturnValue(queryResult(current)),
      findOneAndUpdate: vi.fn().mockReturnValue(queryResult(updated)),
    }
    const service = new StockService(
      makeConnection() as never,
      movementModel as never,
      productModel as never,
      {} as never
    )

    const result = await service.receive(
      'tenant-1',
      {
        clientMutationId: 'receipt-1',
        productId: PRODUCT_ID,
        packageCount: '2',
        quantityPerPackage: '3',
      },
      'user-1'
    )

    expect(result).toBe(updated)
    expect(productModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: current._id,
        tenantId: 'tenant-1',
        'inventory.stockCount': { $exists: true },
      }),
      {
        $inc: {
          'inventory.stockCount': expect.any(Types.Decimal128),
          'inventory.revision': 1,
        },
      },
      expect.objectContaining({ session: expect.anything() })
    )
    const movement = movementModel.create.mock.calls[0][0][0]
    expect(movement.reason).toBe(StockMovementReason.RECEIPT)
    expect(movement.delta.toString()).toBe('6')
    expect(movement.balanceBefore.toString()).toBe('10')
    expect(movement.balanceAfter.toString()).toBe('16')
  })

  it('rejects reconciliation when the submitted revision is stale', async () => {
    const movementModel = {
      findOne: vi.fn().mockReturnValue(queryResult(null)),
      create: vi.fn(),
    }
    const productModel = {
      findOne: vi.fn().mockReturnValue(queryResult(inventoryProduct('10', 4))),
      findOneAndUpdate: vi.fn(),
    }
    const service = new StockService(
      makeConnection() as never,
      movementModel as never,
      productModel as never,
      {} as never
    )

    await expect(
      service.reconcile(
        'tenant-1',
        {
          clientMutationId: 'count-1',
          productId: PRODUCT_ID,
          countedQuantity: '9',
          expectedRevision: 3,
          note: 'Physical count',
        },
        'user-1'
      )
    ).rejects.toThrow('The stock balance changed')

    expect(productModel.findOneAndUpdate).not.toHaveBeenCalled()
    expect(movementModel.create).not.toHaveBeenCalled()
  })

  it('returns the embedded product for a repeated manual operation', async () => {
    const existing = inventoryProduct('16', 4)
    const movementModel = {
      findOne: vi.fn().mockReturnValue(queryResult({ productId: PRODUCT_ID })),
    }
    const productModel = {
      findOne: vi.fn().mockReturnValue(queryResult(existing)),
    }
    const connection = makeConnection()
    const service = new StockService(
      connection as never,
      movementModel as never,
      productModel as never,
      {} as never
    )

    const result = await service.receive(
      'tenant-1',
      {
        clientMutationId: 'receipt-1',
        productId: PRODUCT_ID,
        packageCount: '2',
        quantityPerPackage: '3',
      },
      'user-1'
    )

    expect(result).toBe(existing)
    expect(connection.startSession).not.toHaveBeenCalled()
  })

  it('reconciles spreadsheet quantities and records an import movement', async () => {
    const current = inventoryProduct('10', 3)
    const updated = inventoryProduct('8.5', 4)
    const movementModel = {
      create: vi.fn().mockResolvedValue([]),
    }
    const productModel = {
      findOneAndUpdate: vi.fn().mockReturnValue(queryResult(updated)),
    }
    const tenantService = makeTenantService()
    const session = {} as never
    const service = new StockService(
      makeConnection() as never,
      movementModel as never,
      productModel as never,
      tenantService as never
    )

    const result = await service.applySpreadsheetImport(
      'tenant-1',
      current as never,
      'PC',
      '8.5',
      'user-1',
      'job-1-row-2',
      new Date('2026-01-01T00:00:00.000Z'),
      session
    )

    expect(result).toBe(updated)
    expect(tenantService.addStockUnit).toHaveBeenCalledWith(
      'tenant-1',
      'pc',
      session
    )
    expect(productModel.findOneAndUpdate.mock.calls[0][1]).toEqual({
      $set: { 'inventory.stockCount': expect.any(Types.Decimal128) },
      $inc: { 'inventory.revision': 1 },
    })
    const movement = movementModel.create.mock.calls[0][0][0]
    expect(movement.reason).toBe(StockMovementReason.SPREADSHEET_IMPORT)
    expect(movement.sourceType).toBe(StockMovementSourceType.PRODUCT_IMPORT)
    expect(movement.delta.toString()).toBe('-1.5')
    expect(movement.balanceBefore.toString()).toBe('10')
    expect(movement.balanceAfter.toString()).toBe('8.5')
  })

  it('creates and uses a missing tenant unit for imported inventory', async () => {
    const current = {
      _id: { toString: () => PRODUCT_ID },
      tenantId: 'tenant-1',
      name: 'Imported Product',
    }
    const updated = {
      ...current,
      inventory: {
        stockCount: Types.Decimal128.fromString('0'),
        unit: 'Case',
        revision: 1,
      },
    }
    const movementModel = { create: vi.fn().mockResolvedValue([]) }
    const productModel = {
      findOneAndUpdate: vi.fn().mockReturnValue(queryResult(updated)),
    }
    const tenantService = makeTenantService()
    tenantService.addStockUnit.mockResolvedValue({ label: 'Case' })
    const session = {} as never
    const service = new StockService(
      makeConnection() as never,
      movementModel as never,
      productModel as never,
      tenantService as never
    )

    await service.applySpreadsheetImport(
      'tenant-1',
      current as never,
      'case',
      '0',
      'user-1',
      'job-1-row-3',
      new Date('2026-01-01T00:00:00.000Z'),
      session
    )

    expect(tenantService.addStockUnit).toHaveBeenCalledWith(
      'tenant-1',
      'case',
      session
    )
    expect(productModel.findOneAndUpdate.mock.calls[0][1]).toEqual({
      $set: {
        inventory: {
          stockCount: expect.any(Types.Decimal128),
          unit: 'Case',
          revision: 1,
        },
      },
    })
  })
})
