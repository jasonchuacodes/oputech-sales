import { offlineDb, type LocalTransaction } from './database'
import { type Product } from '../services/product/product.types'
import { type ProductPage } from '../services/product/product.types'
import {
  type CreateTransactionInput,
  type TransactionFilter,
} from '../services/transaction/transaction.api'
import {
  PaymentType,
  TransactionType,
  type Transaction,
  type TransactionItem,
} from '../services/transaction/transaction.types'

const uuid = () => crypto.randomUUID()

export const listLocalProducts = async (
  tenantId: string,
  search?: string
): Promise<Product[]> => {
  const products = await offlineDb.products
    .where('tenantId')
    .equals(tenantId)
    .toArray()
  const term = search?.trim().toLocaleLowerCase()
  if (!term) return products
  return products.filter((product) =>
    product.name.toLocaleLowerCase().includes(term)
  )
}

export const listLocalProductsPage = async (
  tenantId: string,
  page: number,
  pageSize: number,
  search?: string
): Promise<ProductPage> => {
  const term = search?.trim().toLocaleLowerCase()
  const matchingProducts = () => {
    const products = offlineDb.products.where('tenantId').equals(tenantId)
    return term
      ? products.filter((product) =>
          product.name.toLocaleLowerCase().includes(term)
        )
      : products
  }

  const totalCount = await matchingProducts().count()
  const totalPages = Math.ceil(totalCount / pageSize)
  const selectedPage = Math.min(page, Math.max(totalPages, 1))
  const items = await matchingProducts()
    .offset((selectedPage - 1) * pageSize)
    .limit(pageSize)
    .toArray()

  return {
    items,
    page: selectedPage,
    pageSize,
    totalCount,
    totalPages,
    hasNextPage: selectedPage < totalPages,
    hasPreviousPage: selectedPage > 1 && totalPages > 0,
  }
}

export const listLocalTransactions = async (
  tenantId: string,
  filter?: TransactionFilter
): Promise<Transaction[]> => {
  const transactions = await offlineDb.transactions
    .where('tenantId')
    .equals(tenantId)
    .toArray()

  return transactions.filter(
    (transaction) =>
      !transaction.deleted &&
      transaction.occurredAt >= (filter?.from ?? DexieMinDate) &&
      transaction.occurredAt <= (filter?.to ?? DexieMaxDate) &&
      (filter?.processed === undefined ||
        transaction.processed === filter.processed)
  ).sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))
}

const DexieMinDate = ''
const DexieMaxDate = '\uffff'

const makeTransactionItems = async (
  input: CreateTransactionInput,
  tenantId: string
): Promise<TransactionItem[]> => {
  if (input.type === TransactionType.Expense) return []

  const items = input.items ?? []
  const products = await offlineDb.products.bulkGet(
    items.map((item) => item.productId)
  )

  return items.map((item, index) => {
    const product = products[index]
    if (!product || product.tenantId !== tenantId) {
      throw new Error(`Product ${item.productId} is not available offline`)
    }
    return {
      productId: product.id,
      name: product.name,
      price: product.price,
      printCount: product.printCount ?? 0,
      quantity: item.quantity,
    }
  })
}

export const queueLocalTransaction = async (
  input: CreateTransactionInput,
  ownerUserId: string,
  tenantId: string
): Promise<Transaction> => {
  const clientMutationId = input.clientMutationId ?? uuid()
  const occurredAt = input.occurredAt ?? new Date().toISOString()
  const id = `local:${clientMutationId}`
  const items = await makeTransactionItems(input, tenantId)
  const total =
    input.type === TransactionType.Expense
      ? (input.amount ?? 0)
      : items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  if (input.type === TransactionType.Expense && total <= 0) {
    throw new Error('Expense amount must be greater than 0')
  }

  const transaction: LocalTransaction = {
    id,
    tenantId,
    clientMutationId,
    type: input.type,
    items,
    label: input.label,
    paymentType: input.paymentType ?? PaymentType.Cash,
    total,
    processed: false,
    occurredAt,
    syncState: 'pending',
  }

  await offlineDb.transaction(
    'rw',
    offlineDb.transactions,
    offlineDb.outbox,
    async () => {
      await offlineDb.transactions.add(transaction)
      await offlineDb.outbox.add({
        operationId: uuid(),
        kind: 'CREATE_TRANSACTION',
        entityId: id,
        payload: { ...input, clientMutationId, occurredAt },
        ownerUserId,
        tenantId,
        state: 'pending',
        attempts: 0,
        createdAt: occurredAt,
      })
    }
  )

  return transaction
}

export const queueLocalTransactionDelete = async (
  id: string,
  ownerUserId: string,
  tenantId: string
): Promise<boolean> => {
  await offlineDb.transaction(
    'rw',
    offlineDb.transactions,
    offlineDb.outbox,
    async () => {
      const transaction = await offlineDb.transactions.get(id)
      if (!transaction || transaction.tenantId !== tenantId) return

      const createOperation = await offlineDb.outbox
        .where('entityId')
        .equals(id)
        .filter((operation) => operation.kind === 'CREATE_TRANSACTION')
        .first()

      if (createOperation && createOperation.state !== 'syncing') {
        await offlineDb.outbox.delete(createOperation.operationId)
        await offlineDb.transactions.delete(id)
        return
      }

      await offlineDb.transactions.update(id, {
        deleted: true,
        syncState: 'deleting',
      })
      await offlineDb.outbox.add({
        operationId: uuid(),
        kind: 'DELETE_TRANSACTION',
        entityId: id,
        payload: {},
        ownerUserId,
        tenantId,
        state: 'pending',
        attempts: 0,
        createdAt: new Date().toISOString(),
      })
    }
  )
  return true
}
