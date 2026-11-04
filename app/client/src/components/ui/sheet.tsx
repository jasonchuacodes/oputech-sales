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
    <Dialog.Overlay className="fixed inset-0 z-50 bg-foreground/50 backdrop-blur-sm data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:animate-in data-[state=open]:fade-in" />
    <Dialog.Content
      className={cn(
        'fixed inset-x-0 bottom-0 z-60 mx-auto flex max-h-[90dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-sheet bg-card px-5 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-lg outline-none data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom md:inset-x-auto md:top-1/2 md:bottom-auto md:left-1/2 md:w-[calc(100%-3rem)] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-lg md:p-6 md:data-[state=closed]:fade-out-0 md:data-[state=closed]:zoom-out-95 md:data-[state=closed]:slide-out-to-bottom-0 md:data-[state=open]:fade-in-0 md:data-[state=open]:zoom-in-95 md:data-[state=open]:slide-in-from-bottom-0',
        className
      )}
      {...props}
    >
      <div
        aria-hidden="true"
        className="mx-auto h-1.5 w-14 shrink-0 rounded-pill bg-foreground/45 md:hidden"
      />
      {showClose && (
        <Dialog.Close
          aria-label="Close"
          className="absolute top-5 right-4 flex size-11 items-center justify-center rounded-md text-text-secondary hover:bg-background focus-visible:ring-3 focus-visible:ring-ring/30"
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

const SheetTitle = ({ className, ...props }: ComponentProps<typeof Dialog.Title>) => (
  <Dialog.Title className={cn('text-xl font-semibold', className)} {...props} />
)

const SheetDescription = ({ className, ...props }: ComponentProps<typeof Dialog.Description>) => (
  <Dialog.Description className={cn('text-base text-text-secondary', className)} {...props} />
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
