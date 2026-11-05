'use client'

import { X } from 'lucide-react'
import { Dialog } from 'radix-ui'
import { Button } from './button'
import { Spinner } from './spinner'
import { cn } from '@/utils/cn'

interface ConfirmationDialogProps {
  open: boolean
  title: string
  description?: React.ReactNode
  children?: React.ReactNode
  icon?: React.ElementType
  variant?: 'default' | 'danger'
  confirmText?: string
  cancelText?: string
  disabled?: boolean
  loading?: boolean
  maxWidth?: number
  onClose: () => void
  onConfirm: () => void
}

export const ConfirmationDialog = ({
  open,
  title,
  description,
  children,
  icon: Icon,
  variant = 'default',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  disabled,
  loading,
  maxWidth = 480,
  onClose,
  onConfirm,
}: ConfirmationDialogProps) => (
  <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
    <Dialog.Portal>
      <Dialog.Overlay className="bg-foreground/50 data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:animate-in data-[state=open]:fade-in fixed inset-0 z-50 backdrop-blur-sm" />
      <Dialog.Content
        className="bg-card data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 fixed top-1/2 left-1/2 z-60 flex max-h-[90dvh] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg shadow-lg outline-none"
        style={{ maxWidth }}
      >
        <div className="flex items-start gap-3 p-4">
          {Icon && (
            <div
              className={cn(
                'flex size-10 shrink-0 items-center justify-center rounded-md md:size-9',
                variant === 'danger' ? 'bg-destructive' : 'bg-primary'
              )}
            >
              <Icon className="text-primary-foreground size-5" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <Dialog.Title className="text-lg font-bold md:text-base">
              {title}
            </Dialog.Title>
            {description && (
              <Dialog.Description asChild>
                <div className="text-muted-foreground mt-1 text-sm">
                  {description}
                </div>
              </Dialog.Description>
            )}
          </div>
          <Dialog.Close
            aria-label="Close"
            className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-10 shrink-0 items-center justify-center rounded-md transition-colors md:size-9"
          >
            <X className="size-5" />
          </Dialog.Close>
        </div>

        {children && (
          <div className="min-h-0 overflow-y-auto px-4 pb-4">{children}</div>
        )}

        <div className="border-border flex items-center justify-end gap-3 border-t p-4">
          <Button
            type="button"
            variant="outline"
            className="flex-1 sm:flex-none"
            onClick={onClose}
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={variant === 'danger' ? 'destructive' : 'default'}
            className="flex-1 sm:flex-none"
            disabled={disabled || loading}
            onClick={onConfirm}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Spinner size="xs" variant="current" />
                {confirmText}
              </span>
            ) : (
              confirmText
            )}
          </Button>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
)
