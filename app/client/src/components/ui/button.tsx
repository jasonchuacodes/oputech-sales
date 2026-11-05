import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'

import { cn } from '@/utils/cn'

const buttonVariants = cva(
  "group/button text-control inline-flex shrink-0 items-center justify-center rounded-sm border border-transparent bg-clip-padding font-medium whitespace-nowrap transition-[background-color,border-color,color,box-shadow,transform] outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px motion-reduce:transform-none motion-reduce:transition-none disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:size-3.5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: 'bg-brand text-white hover:bg-brand-hover',
        outline:
          'border-border bg-white text-foreground hover:bg-surface-hover aria-expanded:bg-surface-hover',
        secondary:
          'bg-surface text-foreground hover:bg-surface-hover aria-expanded:bg-surface-hover',
        ghost:
          'hover:bg-surface-hover hover:text-foreground aria-expanded:bg-surface-hover',
        destructive:
          'bg-danger text-white hover:bg-danger/90 focus-visible:border-danger/40 focus-visible:ring-danger/20',
        link: 'text-brand underline-offset-4 hover:underline',
      },
      size: {
        default:
          'h-11 gap-2 px-3.5 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3 xl:h-10 xl:gap-1.5 xl:px-3 xl:has-data-[icon=inline-end]:pr-2 xl:has-data-[icon=inline-start]:pl-2',
        xs: 'h-9 gap-1 px-2.5 text-xs has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg]:size-3',
        sm: 'h-10 gap-1.5 px-3 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
        lg: 'h-12 gap-2 px-4 has-data-[icon=inline-end]:pr-3.5 has-data-[icon=inline-start]:pl-3.5 xl:h-11 xl:px-4',
        icon: 'size-11 xl:size-10 [&_svg]:size-4',
        'icon-xs': 'size-7',
        'icon-sm': 'size-8',
        'icon-lg': 'size-12 xl:size-11 [&_svg]:size-4',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = (asChild ? Slot.Root : 'button') as React.ElementType

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
