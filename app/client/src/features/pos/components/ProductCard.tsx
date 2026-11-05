/* eslint-disable @next/next/no-img-element */
import { ShoppingBag } from 'lucide-react'
import { cn } from '../../../utils/cn'
import { formatCurrency } from '../../../utils/number'
import { Product } from '../../../services/product/product.types'

interface ProductCardProps {
  product: Product
  quantity?: number
  onClick: (product: Product) => void
}

export const ProductCard = ({ product, quantity = 0, onClick }: ProductCardProps) => {
  return (
    <button
      type="button"
      onClick={() => onClick(product)}
      className={cn(
        'relative flex min-h-44 min-w-[120px] flex-col gap-3 rounded-card border-2 border-transparent bg-card p-3 text-left shadow-card transition-[border-color,box-shadow,transform] outline-none',
        'cursor-pointer hover:shadow-card-hover focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none',
        quantity > 0 && 'border-primary/50'
      )}
    >
      {quantity > 0 && (
        <span className="absolute top-2 right-2 z-10 flex size-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground shadow-sm">
          {quantity}
        </span>
      )}
      <div className="flex h-24 w-full items-center justify-center overflow-hidden rounded-md bg-slate-100">
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
        <span className="line-clamp-2 text-sm leading-snug font-medium text-text-secondary">
          {product.name}
        </span>
        <span className="text-base font-semibold text-foreground tabular-nums">
          {formatCurrency(product.price)}
        </span>
      </div>
    </button>
  )
}
