import { Spinner } from '@/components'

interface PullToRefreshIndicatorProps {
  isRefreshing: boolean
  height: number
}

export function PullToRefreshIndicator({
  isRefreshing,
  height,
}: PullToRefreshIndicatorProps) {
  if (!isRefreshing) return null

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-center"
      style={{ height }}
    >
      <Spinner
        aria-label="Refreshing content"
        className="motion-reduce:animate-none"
      />
    </div>
  )
}
