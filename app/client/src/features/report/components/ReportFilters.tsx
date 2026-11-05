'use client'

import { useState } from 'react'
import type { DateRange } from 'react-day-picker'
import { Button } from '../../../components'
import { Calendar } from '../../../components/ui/calendar'
import { SheetSelect } from '../../../components/ui/sheet-select'
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '../../../components/ui/sheet'
import { useDisclosure } from '../../../hooks/useDisclosure'
import { APP_TZ, appCalendarDate } from '../../../utils/date'
import {
  type ReportCalendarRange,
  type ReportFilterPreset,
  fromCalendarDate,
  toCalendarDate,
} from '../report-list-state'

const options = [
  { value: 'this_week', label: 'This week' },
  { value: 'this_month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
  { value: 'custom', label: 'Custom range' },
]

interface Props {
  preset: ReportFilterPreset
  range: ReportCalendarRange
  onApply: (preset: ReportFilterPreset, range?: ReportCalendarRange) => void
}

export const ReportFilters = ({ preset, range, onApply }: Props) => {
  const customRange = useDisclosure()
  const [draft, setDraft] = useState<DateRange>()
  const customRangeLabel = `${appCalendarDate(range.from).format('MM/DD/YYYY')} - ${appCalendarDate(range.to).format('MM/DD/YYYY')}`

  const openCustom = () => {
    setDraft({ from: toCalendarDate(range.from), to: toCalendarDate(range.to) })
    customRange.onOpen()
  }

  const handlePreset = (value: string) => {
    const next = value as ReportFilterPreset
    if (next === 'custom') {
      openCustom()
      return
    }
    onApply(next)
  }

  const applyCustom = () => {
    if (!draft?.from || !draft.to) return
    onApply('custom', {
      from: fromCalendarDate(draft.from),
      to: fromCalendarDate(draft.to),
    })
    customRange.onClose()
  }

  return (
    <>
      <div className="flex items-center gap-1.5">
        <span className="text-text-tertiary text-xs">Period</span>
        <SheetSelect
          value={preset}
          onValueChange={handlePreset}
          options={options}
          title="Filter reports by period"
          displayValue={preset === 'custom' ? customRangeLabel : undefined}
          className="text-text-secondary h-10 w-auto border-0 bg-transparent px-1 text-sm font-medium shadow-none [&_svg]:size-4"
        />
      </div>

      <Sheet open={customRange.open} onOpenChange={customRange.setOpen}>
        <SheetContent aria-describedby={undefined}>
          <SheetHeader>
            <SheetTitle>Custom date range</SheetTitle>
          </SheetHeader>
          <SheetBody className="flex justify-center py-2">
            <Calendar
              mode="range"
              selected={draft}
              onSelect={setDraft}
              disabled={{ after: new Date() }}
              timeZone={APP_TZ}
            />
          </SheetBody>
          <SheetFooter>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={customRange.onClose}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="flex-1"
              disabled={!draft?.from || !draft.to}
              onClick={applyCustom}
            >
              Apply
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  )
}
