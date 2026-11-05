'use client'

import { useState } from 'react'
import { PageHeader } from '../../components/ui/page-header'
import { Button, ContentSection, SheetSelect } from '../../components'
import { useAnalytics } from '../../services/analytics/analytics.queries'
import { AnalyticsRange } from '../../services/analytics/analytics.types'
import { SummaryCards } from './components/SummaryCards'
import { SalesExpensesChart } from './components/SalesExpensesChart'
import { TopProducts } from './components/TopProducts'

const RANGE_OPTIONS: { value: AnalyticsRange; label: string }[] = [
  { value: 'TODAY', label: 'Today' },
  { value: 'THIS_WEEK', label: 'This week' },
  { value: 'THIS_MONTH', label: 'This month' },
  { value: 'LAST_MONTH', label: 'Last month' },
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
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-5 py-5 md:p-6">
      <PageHeader
        title="Overview"
        description="Sales and expense performance"
      />

      <ContentSection
        label="Summary"
        rightContent={
          <div className="flex items-center gap-1.5">
            <span className="text-text-tertiary text-xs">Period</span>
            <SheetSelect
              value={range}
              onValueChange={(value) => setRange(value as AnalyticsRange)}
              options={RANGE_OPTIONS}
              title="Choose a reporting period"
              className="text-text-secondary h-10 w-auto border-0 bg-transparent px-1 text-sm font-medium shadow-none [&_svg]:size-4"
            />
          </div>
        }
      >
        {initialLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4">
            <div className="col-span-2 h-28 animate-pulse rounded-card bg-card shadow-card sm:col-span-1" />
            <div className="h-24 animate-pulse rounded-card bg-card shadow-card" />
            <div className="h-24 animate-pulse rounded-card bg-card shadow-card" />
          </div>
        ) : unavailable ? (
          <div className="rounded-card bg-card flex min-h-40 flex-col items-center justify-center gap-2 p-4 text-center shadow-card">
            <p className="text-text-heading font-medium">
              Analytics could not be loaded
            </p>
            <p className="text-text-secondary text-sm">
              Analytics are not stored for offline access on this device.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void analytics.refetch()}
            >
              Retry
            </Button>
          </div>
        ) : data ? (
          <SummaryCards
            totalSales={data.totalSales}
            totalExpenses={data.totalExpenses}
          />
        ) : null}
      </ContentSection>

      {initialLoading ? (
        <div className="h-80 animate-pulse rounded-card bg-card shadow-card" />
      ) : data ? (
        <>
          <SalesExpensesChart series={data.series} />
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <TopProducts products={data.topProducts} />
          </div>
        </>
      ) : null}
    </div>
  )
}

export default DashboardPage
