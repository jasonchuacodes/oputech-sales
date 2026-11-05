interface PageHeaderProps {
  title: string
  description?: string
  action?: React.ReactNode
}

export const PageHeader = ({ title, description, action }: PageHeaderProps) => (
  <div className="flex items-start justify-between gap-4">
    <div className="flex min-w-0 flex-col gap-0.5">
      <h1 className="text-page-title font-semibold">{title}</h1>
      {description && (
        <p className="text-text-secondary text-sm">{description}</p>
      )}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
)
