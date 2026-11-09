'use client'

import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { LayoutGrid, List, Search } from 'lucide-react'
import { Button, ContentSection, Input, Spinner } from '../../components'
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

type ProductView = 'card' | 'row'

const POSPage = () => {
  const [transactionItems, setTransactionItems] = useState<TransactionItem[]>(
    []
  )
  const [paymentType, setPaymentType] = useState<PaymentType>(PaymentType.Cash)
  const [search, setSearch] = useState('')
  const [productView, setProductView] = useState<ProductView>('card')
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
    <div className="mx-auto flex h-full w-full max-w-7xl flex-col gap-5 px-5 py-5 md:p-6">
      <PageHeader
        title="New sale"
        description="Choose products to build the order"
      />

      <div className="flex min-h-0 flex-1 gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="relative w-full md:max-w-md">
            <Search
              aria-hidden="true"
              className="text-text-tertiary pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            />
            <Input
              placeholder="Search products"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

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
            {!isLoading && products.length > 0 && (
              <ContentSection
                label="Products"
                className="px-1"
                rightContent={
                  <div
                    role="group"
                    aria-label="Product display"
                    className="bg-card shadow-card flex items-center rounded-sm p-0.5"
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Card view"
                      aria-pressed={productView === 'card'}
                      className={
                        productView === 'card'
                          ? 'bg-surface-selected text-brand hover:bg-surface-selected'
                          : 'text-text-tertiary'
                      }
                      onClick={() => setProductView('card')}
                    >
                      <LayoutGrid aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Row view"
                      aria-pressed={productView === 'row'}
                      className={
                        productView === 'row'
                          ? 'bg-surface-selected text-brand hover:bg-surface-selected'
                          : 'text-text-tertiary'
                      }
                      onClick={() => setProductView('row')}
                    >
                      <List aria-hidden="true" />
                    </Button>
                  </div>
                }
              >
                {productView === 'card' ? (
                  <div className="mt-2 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
                    {products.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        quantity={
                          transactionItems.find(
                            (item) => item.productId === product.id
                          )?.quantity
                        }
                        onClick={handleProductClick}
                      />
                    ))}
                  </div>
                ) : (
                  <ul className="rounded-card bg-card shadow-card mt-2 overflow-hidden">
                    {products.map((product) => (
                      <li
                        key={product.id}
                        className="border-border/60 border-b last:border-b-0"
                      >
                        <ProductCard
                          product={product}
                          quantity={
                            transactionItems.find(
                              (item) => item.productId === product.id
                            )?.quantity
                          }
                          onClick={handleProductClick}
                          variant="row"
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </ContentSection>
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
