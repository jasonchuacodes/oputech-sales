import { requestGraphQL } from '../../lib/graphql'
import {
  ServerTransaction,
  PaymentType,
  TransactionType,
} from './transaction.types'

export interface CreateTransactionItemInput {
  productId: string
  quantity: number
}

export interface CreateTransactionInput {
  type: TransactionType
  items?: CreateTransactionItemInput[]
  label?: string
  amount?: number
  paymentType: PaymentType
  clientMutationId?: string
  occurredAt?: string
}

export interface TransactionFilter {
  from?: string
  to?: string
  processed?: boolean
}

const GET_TRANSACTIONS = `
  query GetTransactions($filter: TransactionFilter) {
    transactions(filter: $filter) {
      id
      type
      items { productId name price printCount quantity }
      label
      paymentType
      total
      processed
      clientMutationId
      occurredAt
      createdAt
    }
  }
`

const CREATE_TRANSACTION = `
  mutation CreateTransaction($input: CreateTransactionInput!) {
    createTransaction(input: $input) {
      id
      type
      items { productId name price printCount quantity }
      total
      label
      paymentType
      processed
      clientMutationId
      occurredAt
      createdAt
    }
  }
`

const DELETE_TRANSACTION = `
  mutation DeleteTransaction($id: ID!) {
    deleteTransaction(id: $id)
  }
`

export async function getTransactions(filter?: TransactionFilter): Promise<ServerTransaction[]> {
  const data = await requestGraphQL<{ transactions: ServerTransaction[] }>(
    GET_TRANSACTIONS,
    { filter }
  )
  return data.transactions
}

export async function createTransaction(input: CreateTransactionInput): Promise<ServerTransaction> {
  const data = await requestGraphQL<{ createTransaction: ServerTransaction }>(
    CREATE_TRANSACTION,
    { input }
  )
  return data.createTransaction
}

export async function deleteTransaction(id: string): Promise<boolean> {
  const data = await requestGraphQL<{ deleteTransaction: boolean }>(
    DELETE_TRANSACTION,
    { id }
  )
  return data.deleteTransaction
}
