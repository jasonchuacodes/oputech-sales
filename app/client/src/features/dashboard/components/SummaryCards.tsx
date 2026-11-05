import { formatCurrency } from '../../../utils/number'

interface Props {
  totalSales: number
  totalExpenses: number
}

export const SummaryCards = ({ totalSales, totalExpenses }: Props) => {
  const net = totalSales - totalExpenses

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4">
      <div className="col-span-2 flex min-h-32 flex-col justify-between gap-3 rounded-card bg-primary p-5 text-primary-foreground shadow-card sm:col-span-1">
        <span className="text-sm font-medium text-primary-foreground/70">Net income</span>
        <span className="text-3xl font-semibold tracking-tight tabular-nums">
          {formatCurrency(net)}
        </span>
      </div>
      <div className="flex min-h-28 flex-col justify-between gap-3 rounded-card bg-card p-4 shadow-card">
        <span className="text-xs font-semibold tracking-wide text-status-error uppercase">Expenses</span>
        <span className="text-xl font-semibold tabular-nums">
          {formatCurrency(totalExpenses)}
        </span>
      </div>
      <div className="flex min-h-28 flex-col justify-between gap-3 rounded-card bg-card p-4 shadow-card">
        <span className="text-xs font-semibold tracking-wide text-primary uppercase">Total sales</span>
        <span className="text-xl font-semibold tabular-nums">
          {formatCurrency(totalSales)}
        </span>
      </div>
    </div>
  )
}
