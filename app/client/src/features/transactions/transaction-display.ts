import {
  type Transaction,
  TransactionType,
} from '../../services/transaction/transaction.types'

export const getTransactionTitle = (transaction: Transaction) => {
  if (transaction.type === TransactionType.Expense) {
    return transaction.label || 'Expense'
  }

  const [firstItem, ...remainingItems] = transaction.items
  if (!firstItem) return 'Sale'

  const firstItemLabel = `${firstItem.name}${firstItem.quantity > 1 ? ` ×${firstItem.quantity}` : ''}`
  return remainingItems.length > 0
    ? `${firstItemLabel} +${remainingItems.length} more`
    : firstItemLabel
}

export const getTransactionStatus = (transaction: Transaction) => {
  if (transaction.syncState === 'blocked') {
    return {
      label: 'Sync blocked',
      className: 'bg-destructive/10 text-destructive',
    }
  }
  if (transaction.syncState === 'deleting') {
    return { label: 'Deleting', className: 'bg-info/10 text-info' }
  }
  if (transaction.syncState === 'pending') {
    return { label: 'Unsynced', className: 'bg-info/10 text-info' }
  }
  if (transaction.processed) {
    return { label: 'Processed', className: 'bg-success/10 text-success' }
  }
  return { label: 'Pending', className: 'bg-warning/10 text-warning' }
}
