import { describe, expect, it } from 'vitest'
import {
  canonicalizeStockUnit,
  isValidStockUnit,
  normalizeStockUnit,
} from './stock-unit'

describe('stock unit labels', () => {
  it('canonicalizes whitespace while preserving display casing', () => {
    expect(canonicalizeStockUnit('  Shipping   Box ')).toBe('Shipping Box')
  })

  it('normalizes labels case-insensitively', () => {
    expect(normalizeStockUnit(' Box ')).toBe(normalizeStockUnit('box'))
  })

  it('rejects empty, overlong, and control-character labels', () => {
    expect(isValidStockUnit('   ')).toBe(false)
    expect(isValidStockUnit('x'.repeat(25))).toBe(false)
    expect(isValidStockUnit('box\nunit')).toBe(false)
  })
})
