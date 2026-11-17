'use client'

import { useRef, type KeyboardEvent } from 'react'
import { cn } from '@/utils/cn'

type SectionTabOption<Value extends string> = {
  value: Value
  label: string
  id: string
  panelId: string
}

type SectionTabsProps<Value extends string> = {
  ariaLabel: string
  tabs: readonly SectionTabOption<Value>[]
  value: Value
  onValueChange: (value: Value) => void
  className?: string
}

function SectionTabs<Value extends string>({
  ariaLabel,
  tabs,
  value,
  onValueChange,
  className,
}: SectionTabsProps<Value>) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])

  const handleKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number
  ) => {
    let nextIndex: number | undefined

    if (event.key === 'ArrowLeft') {
      nextIndex = (index - 1 + tabs.length) % tabs.length
    }
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length
    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = tabs.length - 1
    if (nextIndex === undefined) return

    event.preventDefault()
    tabRefs.current[nextIndex]?.focus()
    onValueChange(tabs[nextIndex].value)
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      aria-orientation="horizontal"
      className={cn(
        'bg-muted md:border-border w-full rounded-md p-1 md:rounded-none md:border-b md:bg-transparent md:p-0',
        className
      )}
    >
      <div className="flex w-full md:max-w-md">
        {tabs.map((tab, index) => {
          const selected = tab.value === value

          return (
            <button
              key={tab.value}
              ref={(element) => {
                tabRefs.current[index] = element
              }}
              id={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={tab.panelId}
              tabIndex={selected ? 0 : -1}
              className={cn(
                'focus-visible:ring-ring/40 flex min-h-11 flex-1 items-center justify-center rounded-sm px-3 text-sm font-medium transition-colors outline-none focus-visible:z-10 focus-visible:ring-3 md:-mb-px md:min-h-10 md:flex-none md:justify-start md:rounded-none md:border-b-2 md:px-4',
                selected
                  ? 'bg-brand md:border-brand md:text-brand text-white shadow-sm md:bg-transparent md:shadow-none'
                  : 'text-text-secondary hover:bg-surface-hover hover:text-foreground md:border-transparent md:hover:bg-transparent'
              )}
              onClick={() => onValueChange(tab.value)}
              onKeyDown={(event) => handleKeyDown(event, index)}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export { SectionTabs, type SectionTabOption }
