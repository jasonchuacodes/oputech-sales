import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

interface PageHeaderProps {
  title: string
  description?: string
  action?: React.ReactNode
  backHref?: string
  backLabel?: string
}

export const PageHeader = ({
  title,
  description,
  action,
  backHref,
  backLabel = 'Back',
}: PageHeaderProps) => (
  <div className="flex flex-col gap-2">
    {backHref && (
      <Link
        href={backHref}
        aria-label={backLabel}
        className="text-text-secondary hover:text-foreground focus-visible:ring-ring/30 -ml-1 flex w-fit items-center gap-1 rounded-sm px-1 py-1 text-sm outline-none focus-visible:ring-3"
      >
        <ChevronLeft aria-hidden="true" className="size-4" />
        {backLabel}
      </Link>
    )}
    <div className="flex items-start justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-0.5">
        <h1 className="text-page-title font-semibold">{title}</h1>
        {description && (
          <p className="text-text-secondary text-sm">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  </div>
)
