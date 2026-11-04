import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)
dayjs.extend(timezone)

export const APP_TZ = process.env.NEXT_PUBLIC_TIME_ZONE || 'Asia/Manila'

export const appCalendarDate = (date: string): Dayjs => dayjs.tz(date, APP_TZ)

/**
 * format date range. if same day, return single date. else return MM/DD/YY - MM/DD/YY.
 * @param {Dayjs|null} start start date
 * @param {Dayjs|null} end end date
 * @returns {string} formatted range
 */
export const formatRange = (start: Dayjs | null, end: Dayjs | null) => {
  if (start && end && start.isSame(end, 'day')) {
    return start.format('MMMM D, YYYY')
  }

  return `${start ? start.format('MMMM D, YYYY') : 'MMMM D, YYYY'} – ${end ? end.format('MMMM D, YYYY') : 'MMMM D, YYYY'}`
}

export const formatDate = (
  date: string | Date | undefined,
  format?: string
): string => {
  if (date === undefined) return '-'
  return dayjs(date)
    .tz(APP_TZ)
    .format(format ?? 'MMMM D, YYYY')
}

export const formatTime = (timestamp: string | null, format?: string) => {
  if (!timestamp) return '-'
  return dayjs(timestamp)
    .tz(APP_TZ)
    .format(format ?? 'h:mm A')
}

/**
 * get dayjs instance in local timezone.
 */
export const dayjsLocal = (date?: string | Date): Dayjs => {
  return dayjs(date).tz(APP_TZ)
}
