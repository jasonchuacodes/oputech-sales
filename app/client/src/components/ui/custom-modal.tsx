import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/utils/cn'
import { Button } from './button'
import { Spinner } from './spinner'
import { useEffect } from 'react'

type ModalType = 'default' | 'danger'

interface CustomModalProps {
  open: boolean
  title: string
  subheader?: string | React.ReactNode
  children?: React.ReactNode
  disabled?: boolean
  loading?: boolean
  maxWidth?: number
  submitText?: string
  cancelText?: string
  onCancel?: () => void
  onClose: () => void
  onSubmit?: () => void
  type?: ModalType
  icon?: React.ElementType
  hideActions?: boolean
}

export function CustomModal({
  open,
  title,
  subheader,
  children,
  disabled,
  loading,
  maxWidth = 560,
  submitText = 'Submit',
  cancelText = 'Cancel',
  onCancel,
  onClose,
  onSubmit,
  type = 'default',
  icon: Icon,
  hideActions = false,
}: CustomModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6">
      <div className="absolute inset-0 bg-foreground/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative flex w-full flex-col overflow-hidden rounded-t-sheet bg-card shadow-lg md:w-[95%] md:rounded-lg"
        style={{ maxWidth, maxHeight: '90vh' }}
      >
        <div aria-hidden="true" className="mx-auto mt-3 h-1.5 w-14 shrink-0 rounded-pill bg-foreground/40 md:hidden" />
        {/* Header */}
        <div className="flex shrink-0 items-start gap-3 p-4">
          {Icon && (
            <div
              className={cn(
                'relative flex size-10 shrink-0 items-center justify-center rounded-md',
                type === 'danger' ? 'bg-destructive' : 'bg-primary'
              )}
            >
              <Icon className="text-primary-foreground relative z-10 size-5" />
            </div>
          )}
          <div className="flex-1 overflow-hidden">
            <p className="text-foreground text-lg font-bold">{title}</p>
            {subheader && (
              <div className="text-muted-foreground mt-0.5 text-sm">
                {subheader}
              </div>
            )}
          </div>
          <button
            aria-label="close"
            onClick={onClose}
            className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-11 shrink-0 items-center justify-center rounded-md transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Body */}
        {children && (
          <div className="min-h-0 flex-1 overflow-auto p-4 pt-2">
            {children}
          </div>
        )}

        {/* Footer */}
        {!hideActions && (
          <div className="border-border flex shrink-0 items-center justify-end gap-3 border-t p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <Button
              variant="outline"
              className="flex-1 md:flex-none"
              type="button"
              onClick={onCancel ?? onClose}
            >
              {cancelText}
            </Button>
            <Button
              type="button"
              variant={type === 'danger' ? 'destructive' : 'default'}
              className="flex-1 md:flex-none"
              disabled={disabled || loading}
              onClick={onSubmit}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Spinner size="xs" variant="current" />
                  {submitText}
                </span>
              ) : (
                submitText
              )}
            </Button>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
