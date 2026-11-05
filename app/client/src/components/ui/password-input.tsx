import * as React from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/utils/cn'

function PasswordInput({
  className,
  ...props
}: Omit<React.ComponentProps<'input'>, 'type'>) {
  const [visible, setVisible] = React.useState(false)

  return (
    <div
      className={cn(
        'border-input focus-within:border-brand focus-within:ring-brand/10 has-[[aria-invalid=true]]:border-danger has-[[aria-invalid=true]]:ring-danger/20 rounded-input bg-card flex h-12 w-full overflow-hidden border shadow-xs transition-colors focus-within:ring-3 md:h-10',
        className
      )}
    >
      <input
        type={visible ? 'text' : 'password'}
        data-slot="input"
        className="placeholder:text-text-tertiary min-w-0 flex-1 bg-transparent px-4 text-base outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:px-3 md:text-sm [&:-webkit-autofill]:bg-white"
        {...props}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setVisible((prev) => !prev)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        className="border-input text-text-tertiary hover:bg-surface-hover hover:text-text-secondary flex w-12 flex-col items-center justify-center border-l transition-colors md:w-10"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}

export { PasswordInput }
