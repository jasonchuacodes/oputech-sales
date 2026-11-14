import { describe, expect, it } from 'vitest'
import ExcelJS from 'exceljs'
import { InvalidInputException } from '../../src/common/exceptions'
import { ProductWorkbookService } from '../../src/features/product-transfer/product-workbook.service'

const workbookBuffer = async (
  rows: Array<Array<string | number | null>>
): Promise<Buffer> => {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Products')
  worksheet.addRow(['Product ID', 'Product Name', 'Price', 'Unit', 'Quantity'])
  for (const row of rows) worksheet.addRow(row)
  return Buffer.from(await workbook.xlsx.writeBuffer())
}

describe('ProductWorkbookService', () => {
  const service = new ProductWorkbookService()

  it('parses the supported workbook contract', async () => {
    const rows = await service.parseImport(
      await workbookBuffer([
        ['', '  Café   Beans  ', 125.5, 'bag', 10.25],
        ['507f1f77bcf86cd799439011', 'Existing Product', '', '', ''],
      ])
    )

    expect(rows).toMatchObject([
      {
        rowNumber: 2,
        productName: 'Café Beans',
        normalizedName: 'café beans',
        price: 125.5,
        unit: 'bag',
        quantity: '10.25',
        errors: [],
      },
      {
        rowNumber: 3,
        productId: '507f1f77bcf86cd799439011',
        productName: 'Existing Product',
        errors: [],
      },
    ])
  })

  it('reports row-level stock-pair and quantity errors', async () => {
    const [row] = await service.parseImport(
      await workbookBuffer([['', 'Invalid Stock', 10, 'piece', -1]])
    )

    expect(row.errors.map((error) => error.message)).toEqual([
      'Quantity must be a nonnegative number with at most 6 decimal places.',
      'Unit and Quantity must either both be provided or both be blank.',
    ])
  })

  it('rejects formulas as a fatal workbook error', async () => {
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Products')
    worksheet.addRow([
      'Product ID',
      'Product Name',
      'Price',
      'Unit',
      'Quantity',
    ])
    const row = worksheet.addRow(['', 'Formula Product', '', '', ''])
    row.getCell(3).value = { formula: '1+1', result: 2 }
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer())

    await expect(service.parseImport(buffer)).rejects.toBeInstanceOf(
      InvalidInputException
    )
  })

  it('rejects an unexpected worksheet name', async () => {
    const workbook = new ExcelJS.Workbook()
    workbook
      .addWorksheet('Inventory')
      .addRow(['Product ID', 'Product Name', 'Price', 'Unit', 'Quantity'])

    await expect(
      service.parseImport(Buffer.from(await workbook.xlsx.writeBuffer()))
    ).rejects.toThrow('The worksheet must be named Products.')
  })

  it('rejects more than 5,000 product rows', async () => {
    const rows = Array.from({ length: 5_001 }, (_, index) => [
      '',
      `Product ${index + 1}`,
      1,
      '',
      '',
    ])

    await expect(
      service.parseImport(await workbookBuffer(rows))
    ).rejects.toThrow(
      'The workbook cannot contain more than 5,000 product rows.'
    )
  })
})
