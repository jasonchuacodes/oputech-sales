import * as React from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import {
  DayButton,
  DayPicker,
  getDefaultClassNames,
  useDayPicker,
  type MonthCaption,
} from 'react-day-picker'

import { cn } from '@/utils/cn'
import { buttonVariants } from '@/components/ui/button'
import { formatDate } from '@/utils/date'

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = 'label',
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      captionLayout={captionLayout}
      className={cn('bg-white p-1', className)}
      classNames={{
        root: cn('w-fit', defaultClassNames.root),
        months: cn('flex flex-col gap-4', defaultClassNames.months),
        month: cn('flex flex-col gap-3', defaultClassNames.month),
        weekdays: cn('flex', defaultClassNames.weekdays),
        weekday: cn(
          'text-muted-foreground w-11 text-center text-xs font-normal',
          defaultClassNames.weekday
        ),
        week: cn('mt-1 flex w-full', defaultClassNames.week),
        day: cn(
          'group/day relative aspect-square h-11 w-11 p-0 text-center select-none',
          defaultClassNames.day
        ),
        range_start: cn(
          'bg-accent rounded-l-md',
          defaultClassNames.range_start
        ),
        range_middle: cn('rounded-none', defaultClassNames.range_middle),
        range_end: cn('bg-accent rounded-r-md', defaultClassNames.range_end),
        today: cn('text-brand font-semibold', defaultClassNames.today),
        outside: cn(
          'text-muted-foreground/50 aria-selected:text-muted-foreground/50',
          defaultClassNames.outside
        ),
        disabled: cn(
          'text-muted-foreground/50 opacity-50',
          defaultClassNames.disabled
        ),
        hidden: cn('invisible', defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Nav: () => <></>,
        MonthCaption: CalendarMonthCaption,
        DayButton: CalendarDayButton,
      }}
      {...props}
    />
  )
}

function CalendarMonthCaption({
  calendarMonth,
  displayIndex,
}: React.ComponentProps<typeof MonthCaption>) {
  const { previousMonth, nextMonth, goToMonth, months } = useDayPicker()
  const isFirstMonth = displayIndex === 0
  const isLastMonth = displayIndex === months.length - 1

  return (
    <div className="flex h-11 items-center justify-between">
      {isFirstMonth ? (
        <button
          type="button"
          aria-label="Go to previous month"
          disabled={!previousMonth}
          onClick={() => previousMonth && goToMonth(previousMonth)}
          className={cn(
            buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
            'size-11 select-none'
          )}
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>
      ) : (
        <span className="size-11" />
      )}
      <span className="text-sm font-medium">
        {formatDate(calendarMonth.date, 'MMMM YYYY')}
      </span>
      {isLastMonth ? (
        <button
          type="button"
          aria-label="Go to next month"
          disabled={!nextMonth}
          onClick={() => nextMonth && goToMonth(nextMonth)}
          className={cn(
            buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
            'size-11 select-none'
          )}
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      ) : (
        <span className="size-11" />
      )}
    </div>
  )
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  return (
    <button
      type="button"
      data-day={day.date.toLocaleDateString()}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        buttonVariants({ variant: 'ghost' }),
        'h-11 w-11 rounded-sm p-0 text-base font-normal',
        'data-[selected-single=true]:bg-brand data-[selected-single=true]:hover:bg-brand-hover data-[selected-single=true]:text-white',
        'data-[range-middle=true]:bg-accent data-[range-middle=true]:rounded-none',
        'data-[range-start=true]:bg-brand data-[range-end=true]:bg-brand data-[range-end=true]:text-white data-[range-start=true]:text-white',
        className
      )}
      {...props}
    />
  )
}

export { Calendar, CalendarDayButton }
