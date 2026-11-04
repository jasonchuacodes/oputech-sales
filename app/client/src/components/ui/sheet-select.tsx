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
  disabled?: boolean
  className?: string
}

export const SheetSelect = ({
  value,
  onValueChange,
  options,
  title = 'Choose an option',
  placeholder = 'Select an option',
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
      className={cn(
        'flex h-12 w-full items-center justify-between gap-3 rounded-input border border-input bg-card px-4 text-left text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 disabled:opacity-50',
        className
      )}
    >
      <span className={cn('truncate', !selected && 'text-text-tertiary')}>
        {selected?.label ?? placeholder}
      </span>
      <ChevronDown className="size-5 shrink-0 text-text-secondary" />
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
                className="group flex min-h-16 w-full items-center justify-between gap-4 border-b border-border/60 px-5 text-left text-base outline-none last:border-b-0 focus-visible:bg-background"
              >
                <span>{option.label}</span>
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-border text-primary group-data-[state=checked]:border-primary">
                  <RadioGroup.Indicator>
                    <Check className="size-4 stroke-3" />
                  </RadioGroup.Indicator>
                </span>
              </RadioGroup.Item>
            ))}
          </RadioGroup.Root>
        </SheetBody>
        <SheetFooter>
          <Button type="button" className="w-full" disabled={!pending} onClick={handleDone}>
            Done
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
