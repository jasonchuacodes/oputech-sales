'use client'

import { Trash2 } from 'lucide-react'
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
import { formatDate, formatTime } from '@/utils/date'
import { formatCurrency } from '@/utils/number'

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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        showClose
        aria-describedby="transaction-actions-description"
      >
        <SheetHeader>
          <SheetTitle>Transaction actions</SheetTitle>
          <SheetDescription id="transaction-actions-description">
            Review this transaction or choose an available action.
          </SheetDescription>
        </SheetHeader>

        {item && (
          <SheetBody>
            <dl className="rounded-card bg-background grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-3 p-4 text-sm">
              <dt className="text-text-secondary">Type</dt>
              <dd className="text-right font-medium">
                {isExpense ? 'Expense' : 'Sale'}
              </dd>

              <dt className="text-text-secondary">Date</dt>
              <dd className="text-right font-medium">
                {formatDate(item.occurredAt, 'MMM D, YYYY')} at{' '}
                {formatTime(item.occurredAt)}
              </dd>

              <dt className="text-text-secondary">Payment</dt>
              <dd className="text-right font-medium">
                {item.paymentType === PaymentType.Cash ? 'Cash' : 'Online'}
              </dd>

              <dt className="text-text-secondary">Total</dt>
              <dd className="text-right text-base font-semibold">
                {isExpense ? '-' : ''}
                {formatCurrency(item.total)}
              </dd>
            </dl>

            {item.processed && (
              <p className="text-text-secondary pt-3 text-sm">
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
