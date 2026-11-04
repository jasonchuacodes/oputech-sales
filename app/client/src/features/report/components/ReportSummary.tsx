import type { ReportTotals } from '../../../services/report/report.types'
import { formatCurrency } from '../../../utils/number'

interface Props {
  totals: ReportTotals
}

export const ReportSummary = ({ totals }: Props) => (
  <section className="flex flex-col gap-3" aria-labelledby="reports-summary">
    <h2
      id="reports-summary"
      className="text-text-secondary text-xs font-semibold tracking-[0.16em] uppercase"
    >
      Summary
    </h2>
    <dl className="rounded-card bg-card grid grid-cols-2 gap-px overflow-hidden shadow-card sm:grid-cols-4">
      <div className="bg-card p-4">
        <dt className="text-text-secondary text-sm">Cash</dt>
        <dd className="mt-1 font-semibold">{formatCurrency(totals.totalCash)}</dd>
      </div>
      <div className="bg-card p-4">
        <dt className="text-text-secondary text-sm">Online</dt>
        <dd className="mt-1 font-semibold">{formatCurrency(totals.totalOnline)}</dd>
      </div>
      <div className="bg-card p-4">
        <dt className="text-text-secondary text-sm">Expenses</dt>
        <dd className="mt-1 font-semibold">{formatCurrency(totals.totalExpenses)}</dd>
      </div>
      <div className="bg-primary p-4 text-primary-foreground">
        <dt className="text-primary-foreground/70 text-sm">Net income</dt>
        <dd className="mt-1 font-semibold">{formatCurrency(totals.netIncome)}</dd>
      </div>
    </dl>
  </section>
)
