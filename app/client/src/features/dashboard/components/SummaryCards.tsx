import { formatCurrency } from '../../../utils/number'

interface Props {
  totalSales: number
  totalExpenses: number
}

export const SummaryCards = ({ totalSales, totalExpenses }: Props) => {
  const net = totalSales - totalExpenses

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4">
      <div className="col-span-2 flex min-h-28 flex-col justify-between gap-2 rounded-card bg-primary p-4 text-primary-foreground shadow-card sm:col-span-1">
        <span className="text-sm font-medium text-primary-foreground/70">Net income</span>
        <span className="text-metric-lg font-semibold tracking-tight tabular-nums">
          {formatCurrency(net)}
        </span>
      </div>
      <div className="flex min-h-24 flex-col justify-between gap-2 rounded-card bg-card p-3 shadow-card">
        <span className="text-xs font-medium tracking-wide text-status-error uppercase">Expenses</span>
        <span className="text-metric-md font-semibold tabular-nums">
          {formatCurrency(totalExpenses)}
        </span>
      </div>
      <div className="flex min-h-24 flex-col justify-between gap-2 rounded-card bg-card p-3 shadow-card">
        <span className="text-xs font-medium tracking-wide text-primary uppercase">Total sales</span>
        <span className="text-metric-md font-semibold tabular-nums">
          {formatCurrency(totalSales)}
        </span>
      </div>
    </div>
  )
}
