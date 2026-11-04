interface PullToRefreshIndicatorProps {
  pullDistance: number
  isPulling: boolean
  isRefreshing: boolean
  threshold: number
  height: number
}

const INDICATOR_SIZE = 24
const STROKE_WIDTH = 2.5
const RADIUS = (INDICATOR_SIZE - STROKE_WIDTH) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export function PullToRefreshIndicator({
  pullDistance,
  isPulling,
  isRefreshing,
  threshold,
  height,
}: PullToRefreshIndicatorProps) {
  const isVisible = isPulling || isRefreshing || pullDistance > 0
  const progress = Math.min(Math.max(pullDistance / threshold, 0), 1)

  if (!isVisible) return null

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-center"
      style={{ height }}
      role={isRefreshing ? 'status' : undefined}
      aria-label={isRefreshing ? 'Refreshing content' : undefined}
    >
      <svg
        aria-hidden="true"
        className={isRefreshing ? 'size-6 animate-spin motion-reduce:animate-none' : 'size-6'}
        viewBox={`0 0 ${INDICATOR_SIZE} ${INDICATOR_SIZE}`}
      >
        <g transform={`rotate(-90 ${INDICATOR_SIZE / 2} ${INDICATOR_SIZE / 2})`}>
          <circle
            className="stroke-text-tertiary/35 fill-none"
            cx={INDICATOR_SIZE / 2}
            cy={INDICATOR_SIZE / 2}
            r={RADIUS}
            strokeWidth={STROKE_WIDTH}
          />
          <circle
            className="stroke-primary fill-none"
            cx={INDICATOR_SIZE / 2}
            cy={INDICATOR_SIZE / 2}
            r={RADIUS}
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={
              CIRCUMFERENCE * (isRefreshing ? 0.25 : 1 - progress)
            }
          />
        </g>
      </svg>
    </div>
  )
}
