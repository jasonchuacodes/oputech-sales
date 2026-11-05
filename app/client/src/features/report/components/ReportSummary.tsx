import type { ReportTotals } from '../../../services/report/report.types'
import { formatCurrency } from '../../../utils/number'
import { ContentSection } from '../../../components'

interface Props {
  totals: ReportTotals
  action?: React.ReactNode
}

export const ReportSummary = ({ totals, action }: Props) => (
  <ContentSection label="Summary" rightContent={action}>
    <dl className="rounded-card bg-card grid grid-cols-2 gap-px overflow-hidden shadow-card sm:grid-cols-4">
      <div className="bg-card p-3">
        <dt className="text-text-secondary text-sm">Cash</dt>
        <dd className="mt-1 font-semibold">{formatCurrency(totals.totalCash)}</dd>
      </div>
      <div className="bg-card p-3">
        <dt className="text-text-secondary text-sm">Online</dt>
        <dd className="mt-1 font-semibold">{formatCurrency(totals.totalOnline)}</dd>
      </div>
      <div className="bg-card p-3">
        <dt className="text-text-secondary text-sm">Expenses</dt>
        <dd className="mt-1 font-semibold">{formatCurrency(totals.totalExpenses)}</dd>
      </div>
      <div className="bg-primary p-3 text-primary-foreground">
        <dt className="text-primary-foreground/70 text-sm">Net income</dt>
        <dd className="mt-1 font-semibold">{formatCurrency(totals.netIncome)}</dd>
      </div>
    </dl>
  </ContentSection>
)
