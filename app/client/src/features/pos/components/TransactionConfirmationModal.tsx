import { ReceiptText } from 'lucide-react'
import { CustomModal } from '../../../components'
import {
  PaymentType,
  TransactionItem,
} from '../../../services/transaction/transaction.types'
import { formatCurrency } from '../../../utils/number'
import { toTitleCase } from '../../../utils/text'

interface TransactionConfirmationModalProps {
  open: boolean
  items: TransactionItem[]
  paymentType: PaymentType
  loading: boolean
  onClose: () => void
  onConfirm: () => void
}

export const TransactionConfirmationModal = ({
  open,
  items,
  paymentType,
  loading,
  onClose,
  onConfirm,
}: TransactionConfirmationModalProps) => {
  const total = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  )

  return (
    <CustomModal
      open={open}
      title="Confirm Transaction"
      subheader="Review the transaction details before saving."
      icon={ReceiptText}
      submitText="Confirm"
      cancelText="Cancel"
      loading={loading}
      onClose={onClose}
      onSubmit={onConfirm}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <div
              key={item.productId}
              className="flex items-start justify-between gap-4 rounded-md border px-3 py-2"
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-sm font-medium text-slate-800">
                  {item.name}
                </span>
                <span className="text-xs text-slate-500">
                  {formatCurrency(item.price)} × {item.quantity}
                </span>
              </div>
              <span className="shrink-0 text-sm font-semibold text-slate-800">
                {formatCurrency(item.price * item.quantity)}
              </span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2 border-t pt-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Payment Type</span>
            <span className="font-medium text-slate-800">
              {toTitleCase(paymentType)}
            </span>
          </div>
          <div className="flex items-center justify-between text-lg font-semibold text-slate-800">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>
      </div>
    </CustomModal>
  )
}
