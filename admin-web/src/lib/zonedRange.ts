/** Calendar ranges in a temple's time zone, so "today" is that temple's day. */

export function isValidTimeZone(timeZone: string | null | undefined): timeZone is string {
  if (!timeZone || !timeZone.trim()) return false
  try {
    Intl.DateTimeFormat('en-US', { timeZone })
    return true
  } catch {
    return false
  }
}

export function calendarYmd(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

/** Format a YYYY-MM-DD calendar day without shifting it into the browser's timezone. */
export function formatCalendarDay(ymd: string): string {
  const [year, month, day] = ymd.slice(0, 10).split('-').map(Number)
  if (!year || !month || !day) return ymd
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)))
}

export function shiftYmd(ymd: string, days: number): string {
  const [year, month, day] = ymd.split('-').map(Number)
  const shifted = new Date(Date.UTC(year, month - 1, day + days))
  const y = shifted.getUTCFullYear()
  const m = String(shifted.getUTCMonth() + 1).padStart(2, '0')
  const d = String(shifted.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function sameCalendarDayLastYear(ymd: string): string {
  const [year, month, day] = ymd.split('-').map(Number)
  const shifted = new Date(Date.UTC(year - 1, month - 1, day))
  if (shifted.getUTCMonth() !== month - 1) {
    const lastOfMonth = new Date(Date.UTC(year - 1, month, 0))
    return calendarFromUtcDate(lastOfMonth)
  }
  return calendarFromUtcDate(shifted)
}

function calendarFromUtcDate(date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function zoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant)
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '0'
  const hour = get('hour') === '24' ? '0' : get('hour')
  const asUtc = Date.UTC(
    Number(get('year')),
    Number(get('month')) - 1,
    Number(get('day')),
    Number(hour),
    Number(get('minute')),
    Number(get('second')),
  )
  return asUtc - instant.getTime()
}

/** Inclusive start and end of a calendar day in `timeZone`. */
export function zonedDayBounds(ymd: string, timeZone: string): { start: Date; end: Date } {
  const [year, month, day] = ymd.split('-').map(Number)
  const utcMidnight = new Date(Date.UTC(year, month - 1, day, 0, 0, 0))
  const start = new Date(utcMidnight.getTime() - zoneOffsetMs(utcMidnight, timeZone))
  const startFixed = new Date(utcMidnight.getTime() - zoneOffsetMs(start, timeZone))

  const nextUtcMidnight = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0))
  const nextStartGuess = new Date(nextUtcMidnight.getTime() - zoneOffsetMs(nextUtcMidnight, timeZone))
  const nextStart = new Date(nextUtcMidnight.getTime() - zoneOffsetMs(nextStartGuess, timeZone))
  return { start: startFixed, end: new Date(nextStart.getTime() - 1) }
}

export interface TempleRanges {
  timeZone: string
  todayYmd: string
  startOfYear: Date
  endOfToday: Date
  startOfToday: Date
  startOfMonth: Date
  startOfPrevMonth: Date
  endOfPrevMonth: Date
  startOfYesterday: Date
  endOfYesterday: Date
  startOfPriorYtd: Date
  endOfPriorYtd: Date
  last30Start: Date
}

export function buildTempleRanges(timeZone: string, now: Date = new Date()): TempleRanges {
  const todayYmd = calendarYmd(now, timeZone)
  const [year, month] = todayYmd.split('-')
  const today = zonedDayBounds(todayYmd, timeZone)
  const yesterday = zonedDayBounds(shiftYmd(todayYmd, -1), timeZone)
  const prevMonthEndYmd = shiftYmd(`${year}-${month}-01`, -1)
  const prevMonthStartYmd = `${prevMonthEndYmd.slice(0, 8)}01`
  const priorYear = String(Number(year) - 1)
  const priorDay = sameCalendarDayLastYear(todayYmd)

  return {
    timeZone,
    todayYmd,
    startOfYear: zonedDayBounds(`${year}-01-01`, timeZone).start,
    endOfToday: today.end,
    startOfToday: today.start,
    startOfMonth: zonedDayBounds(`${year}-${month}-01`, timeZone).start,
    startOfPrevMonth: zonedDayBounds(prevMonthStartYmd, timeZone).start,
    endOfPrevMonth: zonedDayBounds(prevMonthEndYmd, timeZone).end,
    startOfYesterday: yesterday.start,
    endOfYesterday: yesterday.end,
    startOfPriorYtd: zonedDayBounds(`${priorYear}-01-01`, timeZone).start,
    endOfPriorYtd: zonedDayBounds(priorDay, timeZone).end,
    last30Start: zonedDayBounds(shiftYmd(todayYmd, -29), timeZone).start,
  }
}
