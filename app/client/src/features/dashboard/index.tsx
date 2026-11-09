'use client'

import { useState } from 'react'
import { Bell } from 'lucide-react'
import { PageHeader } from '../../components/ui/page-header'
import { BrandLogo, Button, ContentSection, SheetSelect } from '../../components'
import { useTenantContext } from '../../context/tenant/useTenantContext'
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
  const tenant = useTenantContext()
  const analytics = useAnalytics(range)
  const { data } = analytics
  const initialLoading =
    analytics.isPending && analytics.fetchStatus === 'fetching'
  const unavailable =
    !data && (analytics.isError || analytics.fetchStatus === 'paused')

  return (
    <>
      <header className="border-border/60 bg-background/95 sticky top-0 z-20 flex h-16 items-center justify-between border-b px-5 backdrop-blur md:hidden">
        <div className="flex items-center gap-3">
          <BrandLogo className="w-9 shrink-0" />
          <h1 className="max-w-[13rem] truncate text-base font-medium">
            {tenant.currentTenant?.name ?? 'Oputech Sales'}
          </h1>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled
          aria-label="Notifications coming soon"
          title="Notifications coming soon"
        >
          <Bell className="size-5" aria-hidden="true" />
        </Button>
      </header>

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
            <div className="grid grid-cols-2 gap-3 md:gap-x-4 md:gap-y-2">
              <div className="rounded-card bg-card shadow-card col-span-2 min-h-28 animate-pulse md:col-span-1 md:row-span-2" />
              <div className="rounded-card bg-card shadow-card min-h-24 animate-pulse md:col-start-2 md:row-start-2" />
              <div className="rounded-card bg-card shadow-card min-h-24 animate-pulse md:col-start-2 md:row-start-1" />
            </div>
          ) : unavailable ? (
            <div className="rounded-card bg-card shadow-card flex min-h-40 flex-col items-center justify-center gap-2 p-4 text-center">
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
          <div className="rounded-card bg-card shadow-card h-80 animate-pulse" />
        ) : data ? (
          <>
            <SalesExpensesChart series={data.series} />
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <TopProducts products={data.topProducts} />
            </div>
          </>
        ) : null}
      </div>
    </>
  )
}

export default DashboardPage
