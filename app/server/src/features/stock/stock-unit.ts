export const STOCK_UNIT_MAX_LENGTH = 24

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/u

export const canonicalizeStockUnit = (value: string): string =>
  value.normalize('NFKC').trim().replace(/\s+/gu, ' ')

export const normalizeStockUnit = (value: string): string =>
  canonicalizeStockUnit(value).toLocaleLowerCase('en-US')

export const isValidStockUnit = (value: string): boolean => {
  const canonical = canonicalizeStockUnit(value)
  return (
    canonical.length > 0 &&
    Array.from(canonical).length <= STOCK_UNIT_MAX_LENGTH &&
    !CONTROL_CHARACTERS.test(value)
  )
}
