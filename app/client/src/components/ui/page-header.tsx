interface PageHeaderProps {
  title: string
  description?: string
  action?: React.ReactNode
}

export const PageHeader = ({ title, description, action }: PageHeaderProps) => (
  <div className="flex items-start justify-between gap-4">
    <div className="flex flex-col gap-0.5">
      <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
      {description && (
        <p className="text-sm text-text-secondary md:text-base">{description}</p>
      )}
    </div>
    {action && <div>{action}</div>}
  </div>
)
