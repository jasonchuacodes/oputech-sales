import { describe, expect, it } from 'vitest'
import { validateProductImportFile } from './product-import.schema'

const file = (name: string, size: number) => ({ name, size }) as File

describe('validateProductImportFile', () => {
  it('accepts an xlsx workbook within the size limit', () => {
    expect(
      validateProductImportFile(file('products.xlsx', 1024))
    ).toBeUndefined()
  })

  it('rejects unsupported and empty files', () => {
    expect(validateProductImportFile(file('products.xls', 1024))).toBe(
      'Select an .xlsx workbook.'
    )
    expect(validateProductImportFile(file('products.xlsx', 0))).toBe(
      'The workbook is empty.'
    )
  })

  it('rejects workbooks larger than 5 MiB', () => {
    expect(
      validateProductImportFile(file('products.xlsx', 5 * 1024 * 1024 + 1))
    ).toBe('The workbook cannot be larger than 5 MiB.')
  })
})
