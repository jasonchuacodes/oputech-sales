import * as React from 'react'
import { CalendarIcon } from 'lucide-react'
import { Popover } from 'radix-ui'
import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
} from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { useIsDesktop } from '@/hooks/useIsDesktop'
import { cn } from '@/utils/cn'
import { formatDate } from '@/utils/date'

interface DatePickerProps {
  value?: Date | null
  onChange: (date: Date | undefined) => void
  placeholder?: string
  label?: string
  required?: boolean
  disableFuture?: boolean
  disablePast?: boolean
  disabled?: boolean
  error?: boolean
  className?: string
}

export const DatePicker = ({
  value,
  onChange,
  placeholder = 'Pick a date',
  label,
  required = false,
  disableFuture = false,
  disablePast = false,
  disabled = false,
  error = false,
  className,
}: DatePickerProps) => {
  const isDesktop = useIsDesktop()
  const [open, setOpen] = React.useState(false)
  const [pending, setPending] = React.useState<Date | undefined>(value ?? undefined)

  const handleOpenChange = (next: boolean) => {
    if (next) setPending(value ?? undefined)
    setOpen(next)
  }

  const applyPending = () => {
    onChange(pending)
    setOpen(false)
  }

  const trigger = (
    <Button
      type="button"
      variant="outline"
      disabled={disabled}
      aria-invalid={error}
      className={cn(
        'w-full justify-start font-normal',
        !value && 'text-muted-foreground',
        className
      )}
    >
      <CalendarIcon className="opacity-60" />
      {value ? formatDate(value, 'MMM D, YYYY') : placeholder}
    </Button>
  )

  const calendar = (
    <Calendar
      mode="single"
      selected={pending}
      onSelect={setPending}
      disabled={
        disableFuture
          ? { after: new Date() }
          : disablePast
            ? { before: new Date() }
            : undefined
      }
    />
  )

  const picker = isDesktop ? (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          aria-label={label ?? 'Choose a date'}
          className="z-[9999] overflow-hidden rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-md outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          {calendar}
          <div className="mt-3 flex justify-end gap-2 border-t border-border pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!pending}
              onClick={applyPending}
            >
              Apply
            </Button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  ) : (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent aria-describedby={undefined}>
        <SheetHeader>
          <SheetTitle>{label ?? 'Choose a date'}</SheetTitle>
        </SheetHeader>
        <SheetBody className="flex justify-center py-2">
          {calendar}
        </SheetBody>
        <SheetFooter>
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="flex-1"
            disabled={!pending}
            onClick={applyPending}
          >
            Apply
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )

  if (!label) return picker

  return (
    <div className="flex flex-col gap-1.5">
      <Label>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {picker}
    </div>
  )
}

interface FormDatePickerProps<T extends FieldValues> {
  name: Path<T>
  control: Control<T>
  label?: string
  required?: boolean
  placeholder?: string
  disableFuture?: boolean
  disablePast?: boolean
}

export const FormDatePicker = <T extends FieldValues>({
  name,
  control,
  label,
  required = false,
  placeholder,
  disableFuture = false,
  disablePast = false,
}: FormDatePickerProps<T>) => {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field: { onChange, value }, fieldState: { error } }) => (
        <div className="flex flex-col gap-1.5">
          {label && (
            <Label>
              {label}
              {required && <span className="text-destructive"> *</span>}
            </Label>
          )}

          <DatePicker
            value={value ?? null}
            onChange={(date) => onChange(date ?? null)}
            placeholder={placeholder}
            disableFuture={disableFuture}
            disablePast={disablePast}
            error={!!error}
          />

          {error && (
            <p className="text-destructive text-xs">{error.message}</p>
          )}
        </div>
      )}
    />
  )
}
