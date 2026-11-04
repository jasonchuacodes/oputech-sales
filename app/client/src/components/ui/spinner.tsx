import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/utils/cn'

const spinnerVariants = cva(
  'inline-block shrink-0 animate-spin rounded-full border-2 border-t-transparent',
  {
    variants: {
      size: {
        xs: 'size-4',
        sm: 'size-5',
        default: 'size-6',
        lg: 'size-8',
      },
      variant: {
        primary: 'border-primary',
        current: 'border-current',
      },
    },
    defaultVariants: {
      size: 'default',
      variant: 'primary',
    },
  }
)

interface SpinnerProps
  extends React.ComponentProps<'div'>,
    VariantProps<typeof spinnerVariants> {}

function Spinner({ className, size, variant, ...props }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      data-slot="spinner"
      className={cn(spinnerVariants({ size, variant, className }))}
      {...props}
    />
  )
}

export { Spinner }
