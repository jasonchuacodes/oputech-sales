import { ProductCategory } from './schemas/product.schema'

export interface CreateProductInput {
  name: string
  price: number
  imageUrl?: string
  printCount?: number
  category: ProductCategory
}

export interface UpdateProductInput {
  name?: string
  price?: number
  imageUrl?: string
  printCount?: number
  category?: ProductCategory
}
