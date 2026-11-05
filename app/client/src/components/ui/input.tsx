import * as React from 'react'
import { cn } from '@/utils/cn'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'border-input focus-visible:border-brand focus-visible:ring-brand/10 aria-invalid:border-danger aria-invalid:ring-danger/20 rounded-input bg-card placeholder:text-text-tertiary h-11 w-full min-w-0 border px-3 text-base transition-colors outline-none focus-visible:ring-3 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 xl:h-10 xl:text-sm [&:-webkit-autofill]:bg-white',
        className
      )}
      {...props}
    />
  )
}

export { Input }
