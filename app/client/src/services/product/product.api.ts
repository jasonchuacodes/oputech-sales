import { requestGraphQL } from '../../lib/graphql'
import {
  Product,
  CreateProductInput,
  ProductPage,
  ProductPagination,
  UpdateProductInput,
} from './product.types'

export const PRODUCT_PAGE_SIZE = 50

const PRODUCT_FIELDS = `
  id
  name
  price
  imageUrl
  printCount
`

const GET_PRODUCTS = `
  query GetProducts($pagination: ProductPaginationInput) {
    products(pagination: $pagination) {
      items {
        ${PRODUCT_FIELDS}
      }
      page
      pageSize
      totalCount
      totalPages
      hasNextPage
      hasPreviousPage
    }
  }
`

const GET_PRODUCTS_BY_NAME = `
  query GetProductsByName($search: String!, $pagination: ProductPaginationInput) {
    productsByName(search: $search, pagination: $pagination) {
      items {
        ${PRODUCT_FIELDS}
      }
      page
      pageSize
      totalCount
      totalPages
      hasNextPage
      hasPreviousPage
    }
  }
`

export async function getProducts(
  pagination: ProductPagination,
  tenantId?: string,
  signal?: AbortSignal
): Promise<ProductPage> {
  const data = await requestGraphQL<{ products: ProductPage }>(GET_PRODUCTS, {
    pagination,
  }, { tenantId, signal })
  return data.products
}

export async function getProductsByName(
  search: string,
  pagination: ProductPagination,
  tenantId?: string,
  signal?: AbortSignal
): Promise<ProductPage> {
  const data = await requestGraphQL<{ productsByName: ProductPage }>(
    GET_PRODUCTS_BY_NAME,
    { search, pagination },
    { tenantId, signal }
  )
  return data.productsByName
}

export async function getAllProducts(tenantId?: string): Promise<Product[]> {
  const products: Product[] = []
  let page = 1

  while (true) {
    const result = await getProducts(
      { page, pageSize: PRODUCT_PAGE_SIZE },
      tenantId
    )
    products.push(...result.items)

    if (!result.hasNextPage) return products
    if (result.items.length === 0) {
      throw new Error('The product catalog pagination response was incomplete')
    }
    page += 1
  }
}

const CREATE_PRODUCT = `
  mutation CreateProduct($input: CreateProductInput!) {
    createProduct(input: $input) {
      ${PRODUCT_FIELDS}
    }
  }
`

export async function createProduct(input: CreateProductInput, tenantId?: string): Promise<Product> {
  const data = await requestGraphQL<{ createProduct: Product }>(CREATE_PRODUCT, {
    input,
  }, { tenantId })
  return data.createProduct
}

const UPDATE_PRODUCT = `
  mutation UpdateProduct($id: ID!, $input: UpdateProductInput!) {
    updateProduct(id: $id, input: $input) {
      ${PRODUCT_FIELDS}
    }
  }
`

export async function updateProduct(
  id: string,
  input: UpdateProductInput,
  tenantId?: string,
): Promise<Product> {
  const data = await requestGraphQL<{ updateProduct: Product }>(UPDATE_PRODUCT, {
    id,
    input,
  }, { tenantId })
  return data.updateProduct
}

const DELETE_PRODUCT = `
  mutation DeleteProduct($id: ID!) {
    deleteProduct(id: $id)
  }
`

export async function deleteProduct(id: string, tenantId?: string): Promise<boolean> {
  const data = await requestGraphQL<{ deleteProduct: boolean }>(DELETE_PRODUCT, {
    id,
  }, { tenantId })
  return data.deleteProduct
}
