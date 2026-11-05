'use client'

import { Check, ChevronDown } from 'lucide-react'
import { RadioGroup } from 'radix-ui'
import { useState } from 'react'
import { Button } from './button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from './dropdown-menu'
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './sheet'
import { useDisclosure } from '@/hooks/useDisclosure'
import { useIsDesktop } from '@/hooks/useIsDesktop'
import { cn } from '@/utils/cn'

export type SheetSelectOption = { value: string; label: string }

type SheetSelectProps = {
  value?: string
  onValueChange: (value: string) => void
  options: SheetSelectOption[]
  title?: string
  placeholder?: string
  displayValue?: string
  disabled?: boolean
  className?: string
}

export const SheetSelect = ({
  value,
  onValueChange,
  options,
  title = 'Choose an option',
  placeholder = 'Select an option',
  displayValue,
  disabled,
  className,
}: SheetSelectProps) => {
  const isDesktop = useIsDesktop()
  const selection = useDisclosure()
  const [pending, setPending] = useState(value ?? '')
  const selected = options.find((option) => option.value === value)

  const handleOpenChange = (next: boolean) => {
    if (next) setPending(value ?? '')
    selection.setOpen(next)
  }

  const handleDone = () => {
    if (!pending) return
    onValueChange(pending)
    selection.onClose()
  }

  const trigger = (
    <button
      type="button"
      disabled={disabled}
      aria-label={title}
      className={cn(
        'rounded-input border-input bg-card focus-visible:border-ring focus-visible:ring-ring/20 flex h-11 w-full items-center justify-between gap-2 border px-3 text-left text-base outline-none focus-visible:ring-3 disabled:opacity-50 xl:h-10 xl:text-sm',
        className
      )}
    >
      <span className={cn('truncate', !selected && 'text-text-tertiary')}>
        {displayValue ?? selected?.label ?? placeholder}
      </span>
      <ChevronDown className="text-text-secondary size-5 shrink-0" />
    </button>
  )

  if (isDesktop) {
    return (
      <DropdownMenu open={selection.open} onOpenChange={selection.setOpen}>
        <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          sideOffset={6}
          aria-label={title}
          className="p-1.5"
        >
          <DropdownMenuRadioGroup value={value} onValueChange={onValueChange}>
            {options.map((option) => (
              <DropdownMenuRadioItem
                key={option.value}
                value={option.value}
                className="min-h-10 px-3 py-2 pr-9 text-sm"
              >
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <Sheet open={selection.open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent aria-describedby={undefined}>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <SheetBody className="-mx-5">
          <RadioGroup.Root value={pending} onValueChange={setPending}>
            {options.map((option) => (
              <RadioGroup.Item
                key={option.value}
                value={option.value}
                className="group border-border/60 focus-visible:bg-background flex min-h-14 w-full items-center justify-between gap-4 border-b px-5 text-left text-base outline-none last:border-b-0"
              >
                <span>{option.label}</span>
                <span className="border-border text-primary group-data-[state=checked]:border-primary flex size-6 shrink-0 items-center justify-center rounded-full border-2">
                  <RadioGroup.Indicator>
                    <Check className="size-4 stroke-3" />
                  </RadioGroup.Indicator>
                </span>
              </RadioGroup.Item>
            ))}
          </RadioGroup.Root>
        </SheetBody>
        <SheetFooter>
          <Button
            type="button"
            className="w-full"
            disabled={!pending}
            onClick={handleDone}
          >
            Done
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
