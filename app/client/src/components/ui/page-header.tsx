interface PageHeaderProps {
  title: string
  description?: string
  action?: React.ReactNode
}

export const PageHeader = ({ title, description, action }: PageHeaderProps) => (
  <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
    <div className="flex min-w-0 flex-col gap-0.5">
      <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
        {title}
      </h1>
      {description && (
        <p className="text-text-secondary text-sm">{description}</p>
      )}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
)
