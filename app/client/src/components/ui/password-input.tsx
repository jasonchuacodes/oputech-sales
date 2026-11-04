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
        'border-border focus-within:border-brand focus-within:ring-brand/10 has-[[aria-invalid=true]]:border-danger has-[[aria-invalid=true]]:ring-danger/20 flex h-10 min-h-11 w-full overflow-hidden rounded-sm border bg-white transition-colors focus-within:ring-3',
        className
      )}
    >
      <input
        type={visible ? 'text' : 'password'}
        data-slot="input"
        className="min-w-0 flex-1 bg-white px-3 text-base outline-none placeholder:text-slate-400 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm [&:-webkit-autofill]:bg-white"
        {...props}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setVisible((prev) => !prev)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        className="border-border flex w-10 flex-col items-center justify-center border-l text-gray-400 hover:bg-slate-100 hover:text-gray-600"
      >
        {visible ? (
          <EyeOff className="h-4 w-4" />
        ) : (
          <Eye className="h-4 w-4" />
        )}
      </button>
    </div>
  )
}

export { PasswordInput }
