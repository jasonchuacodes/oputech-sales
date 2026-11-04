import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import isBetween from 'dayjs/plugin/isBetween'
import weekday from 'dayjs/plugin/weekday'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(isBetween)
dayjs.extend(weekday)

const APP_TZ = process.env.NEXT_PUBLIC_TIME_ZONE || 'Asia/Manila'

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

  return `${start ? start.format('MMM DD, YYYY') : 'MMM DD, YYYY'} - ${end ? end.format('MMM DD, YYYY') : 'MMM DD, YYYY'}`
}

/**
 * get initial date range from sessionStorage by key.
 * if exist -> parse + return dayjs start/end of day.
 * else -> return current week (sun–sat).
 * @param {string} key storage key
 * @returns {{ startDate: Dayjs, endDate: Dayjs }} date range object
 */
export const getInitialDateRange = (
  key: string,
  defaults?: { start: Dayjs; end: Dayjs }
) => {
  const saved = sessionStorage.getItem(key)

  if (saved) {
    const { start, end } = JSON.parse(saved)

    return {
      startDate: dayjs(start).startOf('day'),
      endDate: dayjs(end).endOf('day'),
    }
  }

  return {
    startDate: defaults?.start ?? dayjs().weekday(0).startOf('day'),
    endDate: defaults?.end ?? dayjs().weekday(6).endOf('day'),
  }
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

export type WeekPeriod = {
  start: Dayjs
  end: Dayjs
}

/**
 * Get the last completed week (Sunday-Saturday).
 * Current week is never considered "complete" - always returns previous week.
 *
 * Example: Today = Feb 15, 2026 (Sunday) → Returns Feb 8-14
 * Example: Today = Feb 14, 2026 (Saturday) → Returns Feb 1-7
 */
export const getLastCompletedWeek = (
  referenceDate: Dayjs = dayjs()
): WeekPeriod => {
  // Get start of current week (Sunday)
  const currentWeekStart = referenceDate.weekday(0).startOf('day')

  // Go back 7 days to get last completed week's start
  const lastWeekStart = currentWeekStart.subtract(7, 'day')

  // Calculate end (Saturday)
  const lastWeekEnd = lastWeekStart.add(6, 'day').endOf('day')

  return {
    start: lastWeekStart,
    end: lastWeekEnd,
  }
}

/**
 * Get the week period for a given date.
 * Returns the Sunday-Saturday week that contains the date.
 */
export const getWeekPeriod = (date: Dayjs): WeekPeriod => {
  const weekStart = date.weekday(0).startOf('day')
  const weekEnd = date.weekday(6).endOf('day')

  return {
    start: weekStart,
    end: weekEnd,
  }
}

/**
 * Check if a date is in the current week (incomplete).
 */
export const isCurrentWeek = (date: Dayjs): boolean => {
  const today = dayjs()
  const currentWeekStart = today.weekday(0).startOf('day')
  const currentWeekEnd = today.weekday(6).endOf('day')

  return date.isBetween(currentWeekStart, currentWeekEnd, 'day', '[]')
}
