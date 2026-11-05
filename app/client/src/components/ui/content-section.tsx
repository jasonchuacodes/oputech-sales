import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface ContentSectionProps {
  label: string
  rightContent?: ReactNode
  children: ReactNode
  className?: string
}

export const ContentSection = ({
  label,
  rightContent,
  children,
  className,
}: ContentSectionProps) => (
  <section className={cn('flex flex-col gap-0', className)} aria-label={label}>
    <div className="flex min-h-10 items-center justify-between gap-3">
      <h2 className="text-text-heading text-card-title shrink-0 font-sans font-medium">
        {label}
      </h2>
      {rightContent && (
        <div className="flex min-w-0 items-center justify-end">
          {rightContent}
        </div>
      )}
    </div>
    {children}
  </section>
)
