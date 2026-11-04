import type { Dayjs } from 'dayjs'
import { appCalendarDate, dayjsLocal } from '../../utils/date'
import type { ReportDateRangeInput } from '../../services/report/report.types'

export type ReportFilterPreset =
  | 'this_week'
  | 'this_month'
  | 'last_month'
  | 'custom'

export interface ReportCalendarRange {
  from: string
  to: string
}

const toKey = (date: Dayjs) => date.format('YYYY-MM-DD')

export const getReportPresetRange = (
  preset: Exclude<ReportFilterPreset, 'custom'>,
  reference: Dayjs = dayjsLocal()
): ReportCalendarRange => {
  const today = reference.startOf('day')

  if (preset === 'this_week') {
    return { from: toKey(today.subtract(today.day(), 'day')), to: toKey(today) }
  }

  if (preset === 'last_month') {
    const previousMonth = today.subtract(1, 'month')
    return {
      from: toKey(previousMonth.startOf('month')),
      to: toKey(previousMonth.endOf('month')),
    }
  }

  return { from: toKey(today.startOf('month')), to: toKey(today) }
}

export const toReportDateRangeInput = (
  range: ReportCalendarRange
): ReportDateRangeInput => ({
  from: appCalendarDate(range.from).startOf('day').toISOString(),
  to: appCalendarDate(range.to).add(1, 'day').startOf('day').toISOString(),
})

export const toCalendarDate = (key: string): Date => {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export const fromCalendarDate = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const getReportPageCount = (totalCount: number, pageSize: number): number =>
  totalCount === 0 ? 0 : Math.ceil(totalCount / pageSize)
