'use client'

import { X } from 'lucide-react'
import { Dialog } from 'radix-ui'
import { type ComponentProps } from 'react'
import { cn } from '@/utils/cn'

const Sheet = Dialog.Root
const SheetTrigger = Dialog.Trigger
const SheetClose = Dialog.Close

const SheetContent = ({
  className,
  children,
  showClose = false,
  ...props
}: ComponentProps<typeof Dialog.Content> & { showClose?: boolean }) => (
  <Dialog.Portal>
    <Dialog.Overlay className="bg-foreground/50 data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:animate-in data-[state=open]:fade-in fixed inset-0 z-50 backdrop-blur-sm" />
    <Dialog.Content
      className={cn(
        'rounded-t-sheet bg-card data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom md:data-[state=closed]:fade-out-0 md:data-[state=closed]:zoom-out-95 md:data-[state=closed]:slide-out-to-bottom-0 md:data-[state=open]:fade-in-0 md:data-[state=open]:zoom-in-95 md:data-[state=open]:slide-in-from-bottom-0 fixed inset-x-0 bottom-0 z-60 mx-auto flex max-h-[90dvh] w-full max-w-xl flex-col overflow-hidden px-5 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-lg outline-none md:inset-x-auto md:top-1/2 md:bottom-auto md:left-1/2 md:w-[calc(100%-3rem)] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-lg md:p-6',
        className
      )}
      {...props}
    >
      <div
        aria-hidden="true"
        className="rounded-pill bg-foreground/45 mx-auto h-1.5 w-14 shrink-0 md:hidden"
      />
      {showClose && (
        <Dialog.Close
          aria-label="Close"
          className="text-text-secondary hover:bg-background focus-visible:ring-ring/30 absolute top-5 right-4 flex size-11 items-center justify-center rounded-md focus-visible:ring-3 md:size-10"
        >
          <X className="size-5" />
        </Dialog.Close>
      )}
      {children}
    </Dialog.Content>
  </Dialog.Portal>
)

const SheetHeader = ({ className, ...props }: ComponentProps<'div'>) => (
  <div
    className={cn('flex shrink-0 flex-col gap-1 pt-6 pb-4 md:pt-0', className)}
    {...props}
  />
)

const SheetTitle = ({
  className,
  ...props
}: ComponentProps<typeof Dialog.Title>) => (
  <Dialog.Title
    className={cn('text-xl font-semibold md:text-lg', className)}
    {...props}
  />
)

const SheetDescription = ({
  className,
  ...props
}: ComponentProps<typeof Dialog.Description>) => (
  <Dialog.Description
    className={cn('text-text-secondary text-base md:text-sm', className)}
    {...props}
  />
)

const SheetBody = ({ className, ...props }: ComponentProps<'div'>) => (
  <div className={cn('min-h-0 flex-1 overflow-y-auto', className)} {...props} />
)

const SheetFooter = ({ className, ...props }: ComponentProps<'div'>) => (
  <div className={cn('flex shrink-0 gap-3 pt-4', className)} {...props} />
)

export {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
}
