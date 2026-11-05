'use client'

import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Input, Spinner } from '../../components'
import { PageHeader } from '../../components/ui/page-header'
import { PaymentType, TransactionItem } from '../../services/transaction/transaction.types'
import { Product } from '../../services/product/product.types'
import { useProducts } from '../../services/product/product.queries'
import { ProductCard } from './components/ProductCard'
import { SaleCheckout } from './components/SaleCheckout'
import { getPosDraftKey } from './constants'
import { getDraft, saveDraft } from '../../offline/database'
import { useSyncContext } from '../../context/sync/useSyncContext'
import { useAuthContext } from '../../context/auth/useAuthContext'

interface PosDraft {
  items: TransactionItem[]
  paymentType: PaymentType
}

const POSPage = () => {
  const [transactionItems, setTransactionItems] = useState<TransactionItem[]>(
    []
  )
  const [paymentType, setPaymentType] = useState<PaymentType>(PaymentType.Cash)
  const [search, setSearch] = useState('')
  const draftLoaded = useRef(false)
  const { auth } = useAuthContext()
  const draftKey = getPosDraftKey(auth?.currentTenantId)

  const { data: products = [], isLoading } = useProducts(search)
  const { reachability } = useSyncContext()

  useEffect(() => {
    draftLoaded.current = false
    void getDraft<PosDraft>(draftKey).then((draft) => {
      if (draft) {
        setTransactionItems(draft.items)
        setPaymentType(draft.paymentType)
      } else {
        setTransactionItems([])
        setPaymentType(PaymentType.Cash)
      }
      draftLoaded.current = true
    }).catch(() => {
      draftLoaded.current = true
      toast.error('The saved cart could not be restored', {
        id: 'pos-draft-storage',
      })
    })
  }, [draftKey])

  useEffect(() => {
    if (!draftLoaded.current) return
    void saveDraft<PosDraft>(draftKey, {
      items: transactionItems,
      paymentType,
    }).catch(() => {
      toast.error('This cart could not be saved for offline recovery', {
        id: 'pos-draft-storage',
      })
    })
  }, [draftKey, paymentType, transactionItems])

  const mainProducts = products.filter((p) => p.category === 'main')
  const addOnProducts = products.filter((p) => p.category === 'add-on')

  const handleProductClick = (product: Product) => {
    setTransactionItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id)
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          price: product.price,
          printCount: product.printCount ?? 0,
          quantity: 1,
        },
      ]
    })
  }

  const handleRemoveItem = (productId: string) => {
    setTransactionItems((prev) => prev.filter((i) => i.productId !== productId))
  }

  const handleIncrementItem = (productId: string) => {
    setTransactionItems((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item
      )
    )
  }

  const handleDecrementItem = (productId: string) => {
    setTransactionItems((prev) =>
      prev
        .map((item) =>
          item.productId === productId ? { ...item, quantity: item.quantity - 1 } : item
        )
        .filter((item) => item.quantity > 0)
    )
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-7xl flex-col gap-5 px-2 py-5 md:p-6">
      <PageHeader
        title="New sale"
        description="Choose products to build the order"
      />

      <div className="flex min-h-0 flex-1 gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <Input
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full md:max-w-md"
          />

          <div className="flex flex-col gap-6 overflow-y-auto">
            {isLoading && (
              <div className="flex justify-center py-12">
                <Spinner />
              </div>
            )}
            {!isLoading && products.length === 0 && (
              <p className="py-12 text-center text-sm text-slate-400">
                {reachability === 'unreachable' && !search
                  ? 'Connect once to prepare this device for offline sales.'
                  : 'No products found.'}
              </p>
            )}
            {!isLoading && mainProducts.length > 0 && (
              <div className="flex flex-col gap-3 px-1">
                <h2 className="text-sm font-semibold text-slate-700">Main</h2>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
                  {mainProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      quantity={transactionItems.find((item) => item.productId === product.id)?.quantity}
                      onClick={handleProductClick}
                    />
                  ))}
                </div>
              </div>
            )}
            {!isLoading && addOnProducts.length > 0 && (
              <div className="flex flex-col gap-3 px-1">
                <h2 className="text-sm font-semibold text-slate-700">
                  Add-ons
                </h2>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
                  {addOnProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      quantity={transactionItems.find((item) => item.productId === product.id)?.quantity}
                      onClick={handleProductClick}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <SaleCheckout
          draftKey={draftKey}
          items={transactionItems}
          paymentType={paymentType}
          onPaymentTypeChange={setPaymentType}
          onClear={() => setTransactionItems([])}
          onRemoveItem={handleRemoveItem}
          onIncrementItem={handleIncrementItem}
          onDecrementItem={handleDecrementItem}
        />
      </div>
    </div>
  )
}

export default POSPage
