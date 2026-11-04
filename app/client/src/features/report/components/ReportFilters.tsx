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
import { APP_TZ } from '../../../utils/date'
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
  const [customOpen, setCustomOpen] = useState(false)
  const [draft, setDraft] = useState<DateRange>()

  const openCustom = () => {
    setDraft({ from: toCalendarDate(range.from), to: toCalendarDate(range.to) })
    setCustomOpen(true)
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
    setCustomOpen(false)
  }

  return (
    <>
      <div className="min-w-0 flex-1">
        <SheetSelect
          value={preset}
          onValueChange={handlePreset}
          options={options}
          title="Filter reports"
          className="sm:w-64"
        />
      </div>

      <Sheet open={customOpen} onOpenChange={setCustomOpen}>
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
              onClick={() => setCustomOpen(false)}
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
