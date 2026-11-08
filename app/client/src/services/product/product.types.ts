export interface Product {
  id: string
  name: string
  price: number
  imageUrl?: string
  printCount?: number
  stockTrackingEnabled?: boolean
}

export interface ProductPagination {
  page: number
  pageSize: number
}

export interface ProductPage {
  items: Product[]
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
