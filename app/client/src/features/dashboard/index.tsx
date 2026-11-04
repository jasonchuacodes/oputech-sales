'use client'

import { useState } from 'react'
import { PageHeader } from '../../components/ui/page-header'
import { Button, SheetSelect } from '../../components'
import { useAnalytics } from '../../services/analytics/analytics.queries'
import { AnalyticsRange } from '../../services/analytics/analytics.types'
import { SummaryCards } from './components/SummaryCards'
import { SalesExpensesChart } from './components/SalesExpensesChart'
import { TopProducts } from './components/TopProducts'

const RANGE_OPTIONS: { value: AnalyticsRange; label: string }[] = [
  { value: 'TODAY', label: 'Today'},
  { value: 'LAST_7_DAYS', label: 'Last 7 days' },
  { value: 'LAST_15_DAYS', label: 'Last 15 days' },
  { value: 'LAST_MONTH', label: 'Last month' },
  { value: 'LAST_6_MONTHS', label: 'Last 6 months' },
]

const DashboardPage = () => {
  const [range, setRange] = useState<AnalyticsRange>('TODAY')
  const analytics = useAnalytics(range)
  const { data } = analytics
  const initialLoading =
    analytics.isPending && analytics.fetchStatus === 'fetching'
  const unavailable =
    !data && (analytics.isError || analytics.fetchStatus === 'paused')

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-5 md:p-6">
      <PageHeader
        title="Overview"
        description="Sales and expense performance"
        action={
          <SheetSelect
            value={range}
            onValueChange={(v) => setRange(v as AnalyticsRange)}
            options={RANGE_OPTIONS}
            title="Choose a reporting period"
            className="w-44"
          />
        }
      />

      {initialLoading ? (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-card bg-card shadow-card"
              />
            ))}
          </div>
          <div className="h-80 animate-pulse rounded-card bg-card shadow-card" />
        </div>
      ) : unavailable ? (
        <div className="rounded-card bg-card flex min-h-52 flex-col items-center justify-center gap-3 p-6 text-center shadow-card">
          <p className="font-semibold">Analytics could not be loaded</p>
          <p className="text-text-secondary text-sm">
            Analytics are not stored for offline access on this device.
          </p>
          <Button variant="outline" size="sm" onClick={() => void analytics.refetch()}>
            Retry
          </Button>
        </div>
      ) : data ? (
        <>
          <SummaryCards
            totalSales={data.totalSales}
            totalExpenses={data.totalExpenses}
          />
          <SalesExpensesChart series={data.series} />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <TopProducts products={data.topProducts} />
          </div>
        </>
      ) : null}
    </div>
  )
}

export default DashboardPage
