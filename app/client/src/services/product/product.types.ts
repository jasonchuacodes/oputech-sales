export type ProductCategory = 'main' | 'add-on'

export interface Product {
  id: string
  name: string
  price: number
  imageUrl?: string
  printCount?: number
  category: ProductCategory
}

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
