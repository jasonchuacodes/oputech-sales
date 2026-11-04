import { useId } from 'react'
import { type Control } from 'react-hook-form'
import { Minus, Plus, X } from 'lucide-react'
import { cn } from '../../../utils/cn'
import { formatCurrency } from '../../../utils/number'
import { PaymentType, TransactionItem } from '../../../services/transaction/transaction.types'
import { toTitleCase } from '../../../utils/text'
import { Button } from '../../../components'
import { NumberInput } from '../../../components/ui/number-input'

export interface CashPaymentForm {
  cashAmount: number | undefined
}

interface CurrentSaleProps {
  items: TransactionItem[]
  paymentType: PaymentType | null
  cashAmount: number | undefined
  cashPaymentControl: Control<CashPaymentForm>
  onPaymentTypeChange: (type: PaymentType) => void
  onExactAmount: (amount: number) => void
  onSubmit: () => void
  onCancel: () => void
  onRemoveItem: (productId: string) => void
  onIncrementItem: (productId: string) => void
  onDecrementItem: (productId: string) => void
}

export const CurrentSale = ({
  items,
  paymentType,
  cashAmount,
  cashPaymentControl,
  onPaymentTypeChange,
  onExactAmount,
  onSubmit,
  onCancel,
  onRemoveItem,
  onIncrementItem,
  onDecrementItem,
}: CurrentSaleProps) => {
  const cashAmountId = useId()
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const totalInCents = Math.round(total * 100)
  const hasItems = items.length > 0
  const enteredCashInCents = Math.round((cashAmount ?? 0) * 100)
  const hasValidCashAmount =
    cashAmount !== undefined &&
    Number.isFinite(cashAmount) &&
    enteredCashInCents >= totalInCents
  const canSubmit =
    hasItems &&
    paymentType !== null &&
    (paymentType !== PaymentType.Cash || hasValidCashAmount)
  const change = hasValidCashAmount
    ? Math.max(0, enteredCashInCents - totalInCents) / 100
    : 0

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 rounded-card bg-card p-4 shadow-card">
      <div className="flex items-center">
        <h2 className="font-semibold text-slate-800">Current Sale</h2>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
        {!hasItems ? (
          <p className="py-8 text-center text-sm text-slate-400">
            No items added yet.
            <br />
            Select a product to get started.
          </p>
        ) : (
          items.map((item) => (
            <div
              key={item.productId}
              className="flex items-start justify-between gap-2 rounded-md bg-background px-3 py-3"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <span className="truncate text-sm font-medium text-slate-800">{item.name}</span>
                <span className="text-xs text-slate-500">
                  {formatCurrency(item.price)} × {item.quantity}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onDecrementItem(item.productId)}
                    className="flex size-10 items-center justify-center rounded-md bg-card text-primary shadow-xs"
                    aria-label={`Decrease ${item.name}`}
                  >
                    <Minus className="size-4" />
                  </button>
                  <span className="min-w-9 text-center text-sm font-semibold">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => onIncrementItem(item.productId)}
                    className="flex size-10 items-center justify-center rounded-md bg-card text-primary shadow-xs"
                    aria-label={`Increase ${item.name}`}
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <span className="text-sm font-semibold text-foreground">
                  {formatCurrency(item.price * item.quantity)}
                </span>
                <button
                  onClick={() => onRemoveItem(item.productId)}
                  className="text-slate-300 transition-colors hover:text-red-400"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex flex-col border-t pt-3">
        <div className="flex flex-col gap-1.5 pb-3 text-sm">
          <div className="flex justify-between text-xl font-semibold text-slate-800">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 border-t py-3">
          <span className="text-xs font-medium text-slate-500">Mode of Payment</span>
          <div className="flex gap-2">
            {([PaymentType.Cash, PaymentType.Online] as PaymentType[]).map((type) => (
              <Button
                key={type}
                variant={paymentType === type ? 'default' : 'outline'}
                size="lg"
                disabled={!hasItems}
                onClick={() => onPaymentTypeChange(type)}
                className="flex-1"
              >
                {toTitleCase(type)}
              </Button>
            ))}
          </div>

          {paymentType === PaymentType.Cash && hasItems && (
            <div className="mt-2 flex flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onExactAmount(totalInCents / 100)}
                className="w-full"
              >
                Exact Amount
              </Button>

              <div className="flex flex-col gap-1">
                <label htmlFor={cashAmountId} className="text-xs font-medium text-slate-500">
                  Cash Amount
                </label>
                <NumberInput
                  control={cashPaymentControl}
                  name="cashAmount"
                  min={totalInCents / 100}
                  step={0.01}
                  hideControls
                  placeholder={total.toFixed(2)}
                />
                {cashAmount !== undefined && !hasValidCashAmount && (
                  <span className="text-xs text-red-500">
                    Cash amount cannot be less than the total.
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between text-sm font-medium text-slate-700">
                <span>Change</span>
                <span>{formatCurrency(change)}</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1 border-t pt-3">
          <Button
            size="lg"
            disabled={!canSubmit}
            onClick={onSubmit}
            className={cn('w-full', !canSubmit && 'opacity-40')}
          >
            Pay
          </Button>
          <Button variant="outline" disabled={!hasItems} onClick={onCancel} className="w-full">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
