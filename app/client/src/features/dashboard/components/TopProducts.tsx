import { TopProduct } from '../../../services/analytics/analytics.types'
import { ContentSection } from '../../../components'

interface Props {
  products: TopProduct[]
}

export const TopProducts = ({ products }: Props) => (
  <ContentSection
    label="Top selling products"
    className="rounded-card bg-card p-4 shadow-card"
  >
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
              <span className="text-text-heading text-sm font-medium">
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
  </ContentSection>
)
