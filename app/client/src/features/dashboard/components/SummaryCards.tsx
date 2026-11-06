import { formatCurrency } from '../../../utils/number'

interface Props {
  totalSales: number
  totalExpenses: number
}

export const SummaryCards = ({ totalSales, totalExpenses }: Props) => {
  const net = totalSales - totalExpenses

  return (
    <div className="grid grid-cols-2 gap-3 md:gap-x-4 md:gap-y-2">
      <div className="rounded-card bg-primary text-primary-foreground shadow-card col-span-2 flex min-h-28 min-w-0 flex-col justify-between gap-2 p-4 md:col-span-1 md:row-span-2">
        <span className="text-primary-foreground/70 text-sm font-medium">
          Net income
        </span>
        <span className="text-metric-lg font-semibold tracking-tight tabular-nums">
          {formatCurrency(net)}
        </span>
      </div>

      <div className="rounded-card bg-card shadow-card flex min-h-24 min-w-0 flex-col justify-between gap-2 p-3 md:col-start-2 md:row-start-2">
        <span className="text-status-error text-xs font-medium tracking-wide uppercase">
          Expenses
        </span>
        <span className="text-metric-md font-semibold tabular-nums">
          {formatCurrency(totalExpenses)}
        </span>
      </div>

      <div className="rounded-card bg-card shadow-card flex min-h-24 min-w-0 flex-col justify-between gap-2 p-3 md:col-start-2 md:row-start-1">
        <span className="text-primary text-xs font-medium tracking-wide uppercase">
          Total sales
        </span>
        <span className="text-metric-md font-semibold tabular-nums">
          {formatCurrency(totalSales)}
        </span>
      </div>
    </div>
  )
}
