/* eslint-disable @next/next/no-img-element */
import { ShoppingBag } from 'lucide-react'
import { cn } from '../../../utils/cn'
import { formatCurrency } from '../../../utils/number'
import { Product } from '../../../services/product/product.types'

interface ProductCardProps {
  product: Product
  quantity?: number
  onClick: (product: Product) => void
  variant?: 'card' | 'row'
  showPrintCount?: boolean
}

export const ProductCard = ({
  product,
  quantity = 0,
  onClick,
  variant = 'card',
  showPrintCount = false,
}: ProductCardProps) => {
  if (variant === 'row') {
    return (
      <button
        type="button"
        onClick={() => onClick(product)}
        className={cn(
          'bg-card flex min-h-18 w-full cursor-pointer items-center gap-3 p-3 text-left transition-[background-color,box-shadow,transform] outline-none',
          'hover:bg-surface-hover focus-visible:ring-ring/30 focus-visible:z-10 focus-visible:ring-3 focus-visible:ring-inset active:translate-y-px motion-reduce:transform-none motion-reduce:transition-none',
          quantity > 0 && 'bg-surface-selected hover:bg-surface-selected'
        )}
      >
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-text-heading truncate font-medium">
            {product.name}
          </span>
          {quantity > 0 && (
            <span className="text-text-tertiary text-xs tabular-nums">
              {quantity.toLocaleString()} in cart
            </span>
          )}
          {showPrintCount && (
            <span className="text-text-tertiary text-xs tabular-nums">
              {(product.printCount ?? 0).toLocaleString()}{' '}
              {product.printCount === 1 ? 'print' : 'prints'}
            </span>
          )}
        </span>
        <span className="shrink-0 font-semibold whitespace-nowrap tabular-nums">
          {formatCurrency(product.price)}
        </span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onClick(product)}
      className={cn(
        'rounded-card bg-card shadow-card relative flex min-h-40 min-w-[120px] flex-col gap-2 border-2 border-transparent p-3 text-left transition-[border-color,box-shadow,transform] outline-none',
        'hover:shadow-card-hover focus-visible:border-ring focus-visible:ring-ring/30 cursor-pointer focus-visible:ring-3 active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none',
        quantity > 0 && 'border-primary/50'
      )}
    >
      {quantity > 0 && (
        <span className="bg-primary text-primary-foreground absolute top-2 right-2 z-10 flex size-7 items-center justify-center rounded-full text-xs font-semibold">
          {quantity}
        </span>
      )}
      <div className="flex h-20 w-full items-center justify-center overflow-hidden rounded-md bg-slate-100">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <ShoppingBag size={32} className="text-text-tertiary" />
        )}
      </div>

      <div className="flex flex-col gap-0.5">
        <span className="text-text-heading line-clamp-2 text-sm leading-snug font-medium">
          {product.name}
        </span>
        <span className="text-foreground text-sm font-semibold tabular-nums">
          {formatCurrency(product.price)}
        </span>
        {showPrintCount && (
          <span className="text-text-tertiary text-xs tabular-nums">
            {(product.printCount ?? 0).toLocaleString()}{' '}
            {product.printCount === 1 ? 'print' : 'prints'}
          </span>
        )}
      </div>
    </button>
  )
}
