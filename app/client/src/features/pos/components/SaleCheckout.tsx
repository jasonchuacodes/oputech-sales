import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { ShoppingCart } from 'lucide-react'
import {
  PaymentType,
  TransactionItem,
  TransactionType,
} from '../../../services/transaction/transaction.types'
import { useCreateTransaction } from '../../../services/transaction/transaction.queries'
import { clearDraft } from '../../../offline/database'
import { useDisclosure } from '../../../hooks/useDisclosure'
import { useMediaQuery } from '../../../hooks/useMediaQuery'
import { POS_DRAFT_KEY } from '../constants'
import { CartSheet } from './CartSheet'
import { type CashPaymentForm, CurrentSale } from './CurrentSale'
import { TransactionConfirmationModal } from './TransactionConfirmationModal'

interface SaleCheckoutProps {
  items: TransactionItem[]
  paymentType: PaymentType
  onPaymentTypeChange: (type: PaymentType) => void
  onClear: () => void
  onRemoveItem: (productId: string) => void
  onIncrementItem: (productId: string) => void
  onDecrementItem: (productId: string) => void
}

export const SaleCheckout = ({
  items,
  paymentType,
  onPaymentTypeChange,
  onClear,
  onRemoveItem,
  onIncrementItem,
  onDecrementItem,
}: SaleCheckoutProps) => {
  const { control: cashPaymentControl, setValue: setCashPaymentValue } =
    useForm<CashPaymentForm>({
      defaultValues: { cashAmount: undefined },
    })
  const cashAmount = useWatch({
    control: cashPaymentControl,
    name: 'cashAmount',
  })
  const isDesktop = useMediaQuery('(min-width: 900px)')
  const {
    open: cartOpen,
    onOpen: openCart,
    onClose: closeCart,
  } = useDisclosure()
  const confirmation = useDisclosure()
  const createTransaction = useCreateTransaction()

  useEffect(() => {
    if (isDesktop) closeCart()
  }, [closeCart, isDesktop])

  const resetCashPayment = () => {
    setCashPaymentValue('cashAmount', undefined)
  }

  const handlePaymentTypeChange = (type: PaymentType) => {
    onPaymentTypeChange(type)
    if (type === PaymentType.Online) resetCashPayment()
  }

  const handleClear = () => {
    onClear()
    resetCashPayment()
  }

  const handleCancel = () => {
    handleClear()
    closeCart()
  }

  const total = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  )
  const totalInCents = Math.round(total * 100)
  const enteredCashInCents = Math.round((cashAmount ?? 0) * 100)
  const hasValidCashAmount =
    cashAmount !== undefined &&
    Number.isFinite(cashAmount) &&
    enteredCashInCents >= totalInCents

  const handleSubmit = () => {
    if (paymentType === PaymentType.Cash && !hasValidCashAmount) return
    confirmation.onOpen()
  }

  const handleConfirm = () => {
    const transactionItems = items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
    }))

    createTransaction.mutate(
      {
        type: TransactionType.Sale,
        items: transactionItems,
        paymentType,
      },
      {
        onSuccess: () => {
          handleClear()
          confirmation.onClose()
          closeCart()
          void clearDraft(POS_DRAFT_KEY)
        },
      }
    )
  }

  const currentSale = (
    <CurrentSale
      items={items}
      paymentType={paymentType}
      cashAmount={cashAmount}
      cashPaymentControl={cashPaymentControl}
      onPaymentTypeChange={handlePaymentTypeChange}
      onExactAmount={(amount) => setCashPaymentValue('cashAmount', amount)}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      onRemoveItem={onRemoveItem}
      onIncrementItem={onIncrementItem}
      onDecrementItem={onDecrementItem}
    />
  )

  return (
    <>
      {isDesktop ? (
        <div className="flex w-80 shrink-0 flex-col">{currentSale}</div>
      ) : (
        <>
          <div className="fixed right-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-20 md:bottom-4">
            <button
              onClick={openCart}
              className="relative flex min-h-12 items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg"
            >
              <ShoppingCart size={18} />
              Cart
              {items.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                  {items.length}
                </span>
              )}
            </button>
          </div>

          <CartSheet open={cartOpen} onClose={closeCart}>
            {currentSale}
          </CartSheet>
        </>
      )}

      <TransactionConfirmationModal
        open={confirmation.open}
        items={items}
        paymentType={paymentType}
        loading={createTransaction.isPending}
        onClose={confirmation.onClose}
        onConfirm={handleConfirm}
      />
    </>
  )
}
