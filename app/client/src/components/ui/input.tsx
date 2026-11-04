import * as React from 'react'
import { cn } from '@/utils/cn'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'border-input focus-visible:border-brand focus-visible:ring-brand/10 aria-invalid:border-danger aria-invalid:ring-danger/20 h-12 w-full min-w-0 rounded-input border bg-card px-4 text-base shadow-xs transition-colors outline-none placeholder:text-text-tertiary focus-visible:ring-3 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 [&:-webkit-autofill]:bg-white',
        className
      )}
      {...props}
    />
  )
}

export { Input }
