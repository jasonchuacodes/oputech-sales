import { Line } from 'react-chartjs-2'
import type { ChartDataset, ChartOptions } from 'chart.js'
import { ContentSection } from '../../../components'
import './chartSetup'
import { AnalyticsPoint } from '../../../services/analytics/analytics.types'
import { dayjsLocal } from '../../../utils/date'
import { formatCurrency } from '../../../utils/number'

interface Props {
  series: AnalyticsPoint[]
}

const options: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index',
    intersect: false,
  },
  plugins: {
    legend: {
      position: 'top',
      labels: {
        usePointStyle: true,
        pointStyle: 'line',
        boxWidth: 30,
      },
    },
    tooltip: {
      callbacks: {
        label: ({ dataset, parsed }) =>
          `${dataset.label}: ${formatCurrency(parsed.y ?? 0)}`,
      },
    },
  },
  scales: {
    x: {
      grid: {
        display: false,
      },
    },
    y: {
      grid: {
        display: false,
      },
      beginAtZero: true,
      ticks: {
        maxTicksLimit: 5,
        callback: (value) => formatCurrency(Number(value)),
      },
    },
  },
}

const createDataset = (
  label: string,
  data: number[],
  color: string
): ChartDataset<'line'> => ({
  label,
  data,
  borderColor: color,
  backgroundColor: `${color}1A`,
  fill: true,
  tension: 0.3,
})

export const SalesExpensesChart = ({ series }: Props) => {
  if (series.length === 0) {
    return (
      <ContentSection
        label="Sales & Expenses"
        className="rounded-card bg-card p-4 shadow-card"
      >
        <div className="flex h-64 items-center justify-center text-sm text-slate-400">
          No activity in this period.
        </div>
      </ContentSection>
    )
  }

  const data = {
    labels: series.map(({ date }) => dayjsLocal(date).format('MMM D')),
    datasets: [
      createDataset(
        'Sales',
        series.map(({ totalSales }) => totalSales),
        '#17434d'
      ),
      createDataset(
        'Expenses',
        series.map(({ totalExpenses }) => totalExpenses),
        '#b64e4a'
      ),
    ],
  }

  return (
    <ContentSection
      label="Sales & Expenses"
      className="rounded-card bg-card p-4 shadow-card"
    >
      <div className="h-64">
        <Line options={options} data={data} />
      </div>
    </ContentSection>
  )
}
