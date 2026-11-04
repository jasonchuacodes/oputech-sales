import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)

// Fixed business timezone. Dates are always stored/transmitted as UTC instants;
// this is only used to compute local calendar-day boundaries, and must not rely
// on the server process's own OS timezone (process.env.TZ / native Date methods
// are environment-dependent and can silently disagree with this).
export const APP_TZ = process.env.TZ || 'Asia/Manila'

export const dayjsLocal = (date?: Date | string) => dayjs(date).tz(APP_TZ)
