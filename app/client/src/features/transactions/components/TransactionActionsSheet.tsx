'use client'

import { Receipt, ShoppingBag, Trash2 } from 'lucide-react'
import { Button } from '@/components'
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  PaymentType,
  type Transaction,
  TransactionType,
} from '@/services/transaction/transaction.types'
import { formatCurrency } from '@/utils/number'
import { cn } from '@/utils/cn'
import { getTransactionStatus } from '../transaction-display'

type TransactionActionsSheetProps = {
  item: Transaction | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDelete: () => void
}

export const TransactionActionsSheet = ({
  item,
  open,
  onOpenChange,
  onDelete,
}: TransactionActionsSheetProps) => {
  const isExpense = item?.type === TransactionType.Expense
  const HeaderIcon = isExpense ? Receipt : ShoppingBag
  const status = item ? getTransactionStatus(item) : null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        showClose
        aria-describedby="transaction-details-description"
      >
        <SheetHeader>
          <div className="flex items-start gap-3 pr-12">
            <span
              className={cn(
                'flex size-10 shrink-0 items-center justify-center rounded-md',
                isExpense
                  ? 'bg-destructive/10 text-destructive'
                  : 'bg-primary text-primary-foreground'
              )}
            >
              <HeaderIcon className="size-5" aria-hidden="true" />
            </span>
            <div className="flex min-w-0 flex-col gap-1">
              <SheetTitle>Transaction details</SheetTitle>
              <SheetDescription id="transaction-details-description">
                Complete information for this transaction.
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {item && (
          <SheetBody className="flex flex-col gap-4">
            <dl className="rounded-card bg-background grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-3 p-4 text-sm">
              <dt className="text-text-secondary">Type</dt>
              <dd className="text-right font-medium">
                {isExpense ? 'Expense' : 'Sale'}
              </dd>

              <dt className="text-text-secondary">Payment mode</dt>
              <dd className="text-right font-medium">
                {item.paymentType === PaymentType.Cash ? 'Cash' : 'Online'}
              </dd>

              <dt className="text-text-secondary">Status</dt>
              <dd className="text-right">
                {status && (
                  <span
                    className={cn(
                      'inline-flex rounded-full px-2.5 py-1 text-xs font-medium',
                      status.className
                    )}
                  >
                    {status.label}
                  </span>
                )}
              </dd>
            </dl>

            <section
              className="flex flex-col gap-2"
              aria-labelledby="transaction-items"
            >
              <h3
                id="transaction-items"
                className="text-text-secondary text-xs font-semibold tracking-[0.12em] uppercase"
              >
                {isExpense || item.items.length === 1 ? 'Item' : 'Items'}
              </h3>

              {isExpense ? (
                <div className="rounded-card bg-background flex items-start justify-between gap-4 p-4 text-sm">
                  <span className="min-w-0 font-medium break-words">
                    {item.label || 'Expense'}
                  </span>
                  <span className="shrink-0 font-semibold">
                    {formatCurrency(item.total)}
                  </span>
                </div>
              ) : item.items.length > 0 ? (
                <ul className="rounded-card bg-background divide-border divide-y">
                  {item.items.map((transactionItem) => (
                    <li
                      key={transactionItem.productId}
                      className="flex items-start justify-between gap-4 p-4 text-sm"
                    >
                      <span className="min-w-0 font-medium break-words">
                        {transactionItem.name}
                      </span>
                      <span className="shrink-0 font-semibold">
                        {formatCurrency(transactionItem.price)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-card bg-background text-text-secondary p-4 text-sm">
                  No items recorded.
                </p>
              )}
            </section>

            <div className="rounded-card bg-background flex items-center justify-between gap-4 p-4">
              <span className="font-semibold">Total</span>
              <span
                className={cn(
                  'text-lg font-semibold',
                  isExpense && 'text-destructive'
                )}
              >
                {isExpense ? '-' : ''}
                {formatCurrency(item.total)}
              </span>
            </div>

            {item.processed && (
              <p className="text-text-secondary text-sm">
                Processed transactions are included in a report and cannot be
                deleted.
              </p>
            )}
          </SheetBody>
        )}

        <SheetFooter>
          <Button
            type="button"
            variant="destructive"
            className="w-full gap-2"
            disabled={!item || item.processed}
            onClick={onDelete}
          >
            <Trash2 className="size-4" aria-hidden="true" />
            Delete transaction
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
