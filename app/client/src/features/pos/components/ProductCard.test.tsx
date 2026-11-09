import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Product } from '../../../services/product/product.types'
import { ProductCard } from './ProductCard'

const product: Product = {
  id: 'product-1',
  name: 'Photo print',
  price: 125,
  imageUrl: '/photo-print.jpg',
}

describe('ProductCard', () => {
  it('renders the product image in card view', () => {
    const markup = renderToStaticMarkup(
      <ProductCard product={product} onClick={() => undefined} />
    )

    expect(markup).toContain('<img')
    expect(markup).toContain('Photo print')
    expect(markup).toContain('₱125.00')
  })

  it('renders minimal product details in row view', () => {
    const markup = renderToStaticMarkup(
      <ProductCard
        product={product}
        quantity={2}
        onClick={() => undefined}
        variant="row"
      />
    )

    expect(markup).not.toContain('<img')
    expect(markup).toContain('Photo print')
    expect(markup).toContain('₱125.00')
    expect(markup).toContain('2 in cart')
  })

  it('omits cart quantity when the product is not selected', () => {
    const markup = renderToStaticMarkup(
      <ProductCard product={product} onClick={() => undefined} variant="row" />
    )

    expect(markup).not.toContain('in cart')
  })
})
