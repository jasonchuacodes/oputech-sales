export interface InventoryState {
  stockCount: string
  unit: string
  revision: number
}

export interface Product {
  id: string
  name: string
  price: number
  imageUrl?: string
  printCount?: number
  inventory?: InventoryState
}

export interface InventoryProduct extends Product {
  inventory: InventoryState
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
