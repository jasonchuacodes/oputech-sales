import { describe, expect, it } from 'vitest'
import { appCalendarDate } from '../../utils/date'
import {
  getReportPageCount,
  getReportPresetRange,
  toReportDateRangeInput,
} from './report-list-state'

describe('report list state', () => {
  const reference = appCalendarDate('2026-11-04T12:00:00')

  it('builds the current Sunday-start week through today', () => {
    expect(getReportPresetRange('this_week', reference)).toEqual({
      from: '2026-11-01',
      to: '2026-11-04',
    })
  })

  it('builds the current and previous calendar months', () => {
    expect(getReportPresetRange('this_month', reference)).toEqual({
      from: '2026-11-01',
      to: '2026-11-04',
    })
    expect(getReportPresetRange('last_month', reference)).toEqual({
      from: '2026-10-01',
      to: '2026-10-31',
    })
  })

  it('converts inclusive Manila calendar dates to an end-exclusive UTC interval', () => {
    expect(
      toReportDateRangeInput({ from: '2026-11-01', to: '2026-11-04' })
    ).toEqual({
      from: '2026-10-31T16:00:00.000Z',
      to: '2026-11-04T16:00:00.000Z',
    })
  })

  it('handles empty pagination', () => {
    expect(getReportPageCount(0, 10)).toBe(0)
    expect(getReportPageCount(21, 10)).toBe(3)
  })
})
