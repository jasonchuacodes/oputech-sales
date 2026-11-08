import { ProductDocument } from './schemas/product.schema'

export interface ProductPagination {
  page?: number
  pageSize?: number
}

export interface ProductPageResult {
  items: ProductDocument[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export interface CreateProductInput {
  name: string
  price: number
  imageUrl?: string
  printCount?: number
}

export interface UpdateProductInput {
  name?: string
  price?: number
  imageUrl?: string
  printCount?: number
}
