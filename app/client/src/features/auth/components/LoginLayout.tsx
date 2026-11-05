import { cn } from '../../../utils/cn'

interface LoginLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function LoginLayout({
  children,
  className,
  ...props
}: LoginLayoutProps) {
  return (
    <div className="relative flex h-dvh flex-col overflow-hidden">
      <div
        className={cn(
          'app-canvas relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto',
          className
        )}
        {...props}
      >
        {children}
      </div>
    </div>
  )
}
