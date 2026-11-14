import { Injectable } from '@nestjs/common'
import Decimal from 'decimal.js'
import ExcelJS from 'exceljs'
import { InvalidInputException } from '../../common/exceptions'
import { STOCK_UNIT_MAX_LENGTH } from '../stock/stock-unit'
import {
  MAX_PRODUCT_TRANSFER_ROWS,
  PRODUCT_TRANSFER_HEADERS,
  PRODUCT_TRANSFER_WORKSHEET,
} from './product-transfer.constants'
import {
  ParsedProductRow,
  ProductTransferRowError,
} from './product-transfer.types'
import {
  canonicalizeProductName,
  normalizeProductName,
} from './product-transfer.utils'
import { ProductDocument } from '../product/schemas/product.schema'

const PRODUCT_NAME_MAX_LENGTH = 120
const FORMULA_PREFIX = /^[=+\-@]/u

@Injectable()
export class ProductWorkbookService {
  async parseImport(buffer: Buffer): Promise<ParsedProductRow[]> {
    const workbook = new ExcelJS.Workbook()
    try {
      await workbook.xlsx.load(Uint8Array.from(buffer).buffer)
    } catch {
      throw new InvalidInputException(
        'The workbook could not be read. Upload a valid .xlsx file.'
      )
    }

    if (workbook.worksheets.length !== 1) {
      throw new InvalidInputException(
        `The workbook must contain exactly one worksheet named ${PRODUCT_TRANSFER_WORKSHEET}.`
      )
    }
    const worksheet = workbook.worksheets[0]
    if (worksheet.name !== PRODUCT_TRANSFER_WORKSHEET) {
      throw new InvalidInputException(
        `The worksheet must be named ${PRODUCT_TRANSFER_WORKSHEET}.`
      )
    }
    if ((worksheet.model.merges ?? []).length > 0) {
      throw new InvalidInputException('Merged cells are not supported.')
    }

    this.assertHeaders(worksheet)
    const rows: ParsedProductRow[] = []
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1 || this.isBlankRow(row)) return
      if (rows.length >= MAX_PRODUCT_TRANSFER_ROWS) {
        throw new InvalidInputException(
          `The workbook cannot contain more than ${MAX_PRODUCT_TRANSFER_ROWS.toLocaleString()} product rows.`
        )
      }
      this.assertNoUnexpectedCells(row)
      rows.push(this.parseRow(row, rowNumber))
    })

    if (rows.length === 0) {
      throw new InvalidInputException(
        'The workbook does not contain any product rows.'
      )
    }
    return rows
  }

  async createErrorWorkbook(
    errors: ProductTransferRowError[]
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Errors')
    worksheet.columns = [
      { header: 'Row', key: 'row', width: 10 },
      { header: 'Column', key: 'column', width: 20 },
      { header: 'Submitted Value', key: 'submittedValue', width: 30 },
      { header: 'Error', key: 'error', width: 60 },
    ]
    for (const error of errors) {
      worksheet.addRow({
        row: error.rowNumber,
        column: error.column,
        submittedValue: this.safeSpreadsheetText(error.submittedValue),
        error: error.message,
      })
    }
    worksheet.getRow(1).font = { bold: true }
    return Buffer.from(await workbook.xlsx.writeBuffer())
  }

  async createExportWorkbook(products: ProductDocument[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet(PRODUCT_TRANSFER_WORKSHEET)
    worksheet.columns = [
      { header: 'Product ID', key: 'productId', width: 26 },
      { header: 'Product Name', key: 'productName', width: 34 },
      { header: 'Price', key: 'price', width: 15 },
      { header: 'Unit', key: 'unit', width: 18 },
      { header: 'Quantity', key: 'quantity', width: 18 },
    ]
    for (const product of products) {
      worksheet.addRow({
        productId: product._id.toString(),
        productName: this.safeSpreadsheetText(product.name),
        price: product.price,
        unit: product.inventory?.unit ?? '',
        quantity: product.inventory?.stockCount.toString() ?? '',
      })
    }
    worksheet.getRow(1).font = { bold: true }
    worksheet.views = [{ state: 'frozen', ySplit: 1 }]
    return Buffer.from(await workbook.xlsx.writeBuffer())
  }

  private assertHeaders(worksheet: ExcelJS.Worksheet): void {
    const header = worksheet.getRow(1)
    const actual = PRODUCT_TRANSFER_HEADERS.map((_, index) =>
      this.cellText(header.getCell(index + 1), false)
    )
    if (
      actual.some(
        (value, index) => value !== PRODUCT_TRANSFER_HEADERS[index]
      ) ||
      header.actualCellCount !== PRODUCT_TRANSFER_HEADERS.length
    ) {
      throw new InvalidInputException(
        `The header row must contain exactly: ${PRODUCT_TRANSFER_HEADERS.join(', ')}.`
      )
    }
  }

  private parseRow(row: ExcelJS.Row, rowNumber: number): ParsedProductRow {
    const errors: ProductTransferRowError[] = []
    const productId = this.readText(row, 1, 'Product ID', errors, 64)
    const rawName = this.readText(
      row,
      2,
      'Product Name',
      errors,
      PRODUCT_NAME_MAX_LENGTH
    )
    const productName = rawName ? canonicalizeProductName(rawName) : undefined
    if (!productName) {
      errors.push(
        this.error(rowNumber, 'Product Name', '', 'Product Name is required.')
      )
    }

    const price = this.readDecimalNumber(row, 3, 'Price', errors, 2)
    const unit = this.readText(row, 4, 'Unit', errors, STOCK_UNIT_MAX_LENGTH)
    const quantity = this.readQuantity(row, 5, errors)
    if (Boolean(unit) !== Boolean(quantity)) {
      errors.push(
        this.error(
          rowNumber,
          unit ? 'Quantity' : 'Unit',
          '',
          'Unit and Quantity must either both be provided or both be blank.'
        )
      )
    }

    return {
      rowNumber,
      productId,
      productName,
      normalizedName: productName
        ? normalizeProductName(productName)
        : undefined,
      price,
      unit,
      quantity,
      errors,
    }
  }

  private assertNoUnexpectedCells(row: ExcelJS.Row): void {
    for (
      let column = PRODUCT_TRANSFER_HEADERS.length + 1;
      column <= row.cellCount;
      column += 1
    ) {
      const value = row.getCell(column).value
      if (value !== null && value !== undefined && String(value).trim()) {
        throw new InvalidInputException(
          `Row ${row.number} contains data outside the supported columns.`
        )
      }
    }
  }

  private readText(
    row: ExcelJS.Row,
    columnNumber: number,
    column: string,
    errors: ProductTransferRowError[],
    maxLength: number
  ): string | undefined {
    const cell = row.getCell(columnNumber)
    const raw = this.cellText(cell, true)
    if (!raw) return undefined
    if (FORMULA_PREFIX.test(raw)) {
      errors.push(
        this.error(
          row.number,
          column,
          raw,
          `${column} cannot begin with a formula character.`
        )
      )
      return undefined
    }
    const value = raw.normalize('NFKC').trim().replace(/\s+/gu, ' ')
    if (Array.from(value).length > maxLength) {
      errors.push(
        this.error(
          row.number,
          column,
          value,
          `${column} cannot exceed ${maxLength} characters.`
        )
      )
      return undefined
    }
    return value
  }

  private readDecimalNumber(
    row: ExcelJS.Row,
    columnNumber: number,
    column: string,
    errors: ProductTransferRowError[],
    maxDecimalPlaces: number
  ): number | undefined {
    const cell = row.getCell(columnNumber)
    const raw = this.scalarValue(cell)
    if (raw === undefined || raw === '') return undefined
    try {
      const decimal = new Decimal(String(raw))
      if (!decimal.isFinite() || decimal.isNegative())
        throw new Error('invalid')
      if (decimal.decimalPlaces() > maxDecimalPlaces) {
        throw new Error('precision')
      }
      if (decimal.greaterThan(Number.MAX_SAFE_INTEGER)) throw new Error('range')
      return decimal.toNumber()
    } catch {
      errors.push(
        this.error(
          row.number,
          column,
          String(raw),
          `${column} must be a nonnegative number with at most ${maxDecimalPlaces} decimal places.`
        )
      )
      return undefined
    }
  }

  private readQuantity(
    row: ExcelJS.Row,
    columnNumber: number,
    errors: ProductTransferRowError[]
  ): string | undefined {
    const cell = row.getCell(columnNumber)
    const raw = this.scalarValue(cell)
    if (raw === undefined || raw === '') return undefined
    try {
      const decimal = new Decimal(String(raw))
      if (
        !decimal.isFinite() ||
        decimal.isNegative() ||
        decimal.decimalPlaces() > 6
      ) {
        throw new Error('invalid')
      }
      return decimal.toString()
    } catch {
      errors.push(
        this.error(
          row.number,
          'Quantity',
          String(raw),
          'Quantity must be a nonnegative number with at most 6 decimal places.'
        )
      )
      return undefined
    }
  }

  private cellText(cell: ExcelJS.Cell, rejectUnsupported: boolean): string {
    const value = this.scalarValue(cell, rejectUnsupported)
    return value === undefined ? '' : String(value).trim()
  }

  private scalarValue(
    cell: ExcelJS.Cell,
    rejectUnsupported = true
  ): string | number | undefined {
    if (cell.type === ExcelJS.ValueType.Null) return undefined
    if (
      cell.type === ExcelJS.ValueType.String ||
      cell.type === ExcelJS.ValueType.Number
    ) {
      return cell.value as string | number
    }
    if (!rejectUnsupported && cell.value !== null && cell.value !== undefined) {
      return String(cell.value)
    }
    throw new InvalidInputException(
      `Cell ${cell.address} contains a formula or unsupported value type.`
    )
  }

  private isBlankRow(row: ExcelJS.Row): boolean {
    for (
      let column = 1;
      column <= PRODUCT_TRANSFER_HEADERS.length;
      column += 1
    ) {
      const cell = row.getCell(column)
      if (
        cell.value !== null &&
        cell.value !== undefined &&
        String(cell.value).trim()
      ) {
        return false
      }
    }
    return true
  }

  private error(
    rowNumber: number,
    column: string,
    submittedValue: string,
    message: string
  ): ProductTransferRowError {
    return { rowNumber, column, submittedValue, message }
  }

  private safeSpreadsheetText(value: string): string {
    return FORMULA_PREFIX.test(value) ? `'${value}` : value
  }
}
