import { describe, expect, it } from 'vitest'
import { EditProductSchema } from '../schemas/edit-product.schema'
import { getEditProductDefaultValues } from './EditItemModal'

describe('getEditProductDefaultValues', () => {
  it('normalizes a nullable print count to a valid form value', () => {
    const defaults = getEditProductDefaultValues({
      id: 'product-1',
      name: 'Photo print',
      price: 125,
      imageUrl: null,
      printCount: null,
    })

    expect(defaults.printCount).toBe(0)
    expect(EditProductSchema.safeParse(defaults).success).toBe(true)
  })
})
