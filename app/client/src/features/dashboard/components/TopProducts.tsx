import { TopProduct } from '../../../services/analytics/analytics.types'

interface Props {
  products: TopProduct[]
}

export const TopProducts = ({ products }: Props) => (
  <div className="flex flex-col gap-3 rounded-card bg-card p-5 shadow-xs">
    <h3 className="text-sm font-semibold text-slate-700">
      Top Selling Products
    </h3>
    {products.length === 0 ? (
      <div className="flex h-32 items-center justify-center text-sm text-slate-400">
        No sales in this period.
      </div>
    ) : (
      <ol className="flex flex-col gap-1">
        {products.map((p, i) => (
          <li
            key={p.productId}
            className="flex min-h-12 items-center justify-between rounded-md px-2 py-2 hover:bg-background"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs text-slate-600">
                {i + 1}
              </span>
              <span className="text-sm font-medium text-slate-800">
                {p.name}
              </span>
            </div>
            <span className="text-sm text-foreground">
              {p.quantitySold} sold
            </span>
          </li>
        ))}
      </ol>
    )}
  </div>
)
