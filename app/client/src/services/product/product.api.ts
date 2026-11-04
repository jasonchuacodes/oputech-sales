import { requestGraphQL } from '../../lib/graphql'
import { Product, CreateProductInput, UpdateProductInput } from './product.types'

const PRODUCT_FIELDS = `
  id
  name
  price
  imageUrl
  printCount
  category
`

const GET_PRODUCTS = `
  query GetProducts($search: String) {
    products(search: $search) {
      ${PRODUCT_FIELDS}
    }
  }
`

export async function getProducts(search?: string): Promise<Product[]> {
  const data = await requestGraphQL<{ products: Product[] }>(GET_PRODUCTS, {
    search: search || undefined,
  })
  return data.products
}

const CREATE_PRODUCT = `
  mutation CreateProduct($input: CreateProductInput!) {
    createProduct(input: $input) {
      ${PRODUCT_FIELDS}
    }
  }
`

export async function createProduct(input: CreateProductInput): Promise<Product> {
  const data = await requestGraphQL<{ createProduct: Product }>(CREATE_PRODUCT, {
    input,
  })
  return data.createProduct
}

const UPDATE_PRODUCT = `
  mutation UpdateProduct($id: ID!, $input: UpdateProductInput!) {
    updateProduct(id: $id, input: $input) {
      ${PRODUCT_FIELDS}
    }
  }
`

export async function updateProduct(id: string, input: UpdateProductInput): Promise<Product> {
  const data = await requestGraphQL<{ updateProduct: Product }>(UPDATE_PRODUCT, {
    id,
    input,
  })
  return data.updateProduct
}

const DELETE_PRODUCT = `
  mutation DeleteProduct($id: ID!) {
    deleteProduct(id: $id)
  }
`

export async function deleteProduct(id: string): Promise<boolean> {
  const data = await requestGraphQL<{ deleteProduct: boolean }>(DELETE_PRODUCT, {
    id,
  })
  return data.deleteProduct
}
