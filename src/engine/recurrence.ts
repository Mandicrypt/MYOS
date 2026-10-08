import { deterministicId } from '@/lib/id'
import type { ISODate, RecurrenceFrequency, TaskSeries } from '@/types'

/**
 * Recurrence: which days a repeating task falls on. Pure functions, no clock, no state.
 *
 * Dates are calendar dates ("2026-10-08"), never moments in time, so daylight saving
 * and time zones can't shift an occurrence to another day. All arithmetic is done in UTC
 * on whole days. The only time-zone code is `dateInTimeZone`, which turns "now" into the
 * calendar date it is in a series' timezone.
 */

export type RecurrenceRule = Pick<
  TaskSeries,
  'frequency' | 'interval' | 'daysOfWeek' | 'dayOfMonth' | 'startsOn' | 'endsOn'
>

const DAY_MS = 86_400_000
/** Safety limit for any scan, so a bad rule can never loop for long. */
const MAX_SCAN_DAYS = 366 * 5

const parts = (date: ISODate) => date.split('-').map(Number) as [number, number, number]

/** Whole days since 1970-01-01. */
export const toDayNumber = (date: ISODate): number => {
  const [y, m, d] = parts(date)
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS)
}
export const fromDayNumber = (n: number): ISODate => new Date(n * DAY_MS).toISOString().slice(0, 10)
export const addDaysTo = (date: ISODate, n: number): ISODate => fromDayNumber(toDayNumber(date) + n)
export const daysApart = (from: ISODate, to: ISODate): number => toDayNumber(to) - toDayNumber(from)

/** 0 = Monday … 6 = Sunday. */
export const weekdayOf = (date: ISODate): number => (((toDayNumber(date) + 3) % 7) + 7) % 7
const mondayOf = (date: ISODate): number => toDayNumber(date) - weekdayOf(date)
const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate()

/** Cleans a rule so every function below can trust it. */
export function normalizeRule<T extends RecurrenceRule>(rule: T): T {
  return {
    ...rule,
    interval: Math.max(1, Math.min(365, Math.round(Number(rule.interval) || 1))),
    daysOfWeek: [...new Set(rule.daysOfWeek.map((d) => Math.round(d)).filter((d) => d >= 0 && d <= 6))].sort(),
    dayOfMonth:
      rule.dayOfMonth === null || rule.dayOfMonth === undefined
        ? null
        : Math.max(1, Math.min(31, Math.round(rule.dayOfMonth))),
  }
}

/** Does this rule produce an occurrence on `date`? */
export function occursOn(rawRule: RecurrenceRule, date: ISODate): boolean {
  const rule = normalizeRule(rawRule)
  if (date < rule.startsOn || (rule.endsOn !== null && date > rule.endsOn)) return false

  switch (rule.frequency) {
    case 'daily':
      return daysApart(rule.startsOn, date) % rule.interval === 0
    case 'weekly': {
      const days = rule.daysOfWeek.length ? rule.daysOfWeek : [weekdayOf(rule.startsOn)]
      if (!days.includes(weekdayOf(date))) return false
      const weeksApart = (mondayOf(date) - mondayOf(rule.startsOn)) / 7
      return weeksApart % rule.interval === 0
    }
    case 'monthly': {
      const [sy, sm, sd] = parts(rule.startsOn)
      const [y, m, d] = parts(date)
      const monthsApart = y * 12 + m - (sy * 12 + sm)
      if (monthsApart % rule.interval !== 0) return false
      // A month without the chosen day (31st in April, 30th in February) uses its last day.
      return d === Math.min(rule.dayOfMonth ?? sd, daysInMonth(y, m))
    }
  }
}

/** Every occurrence date from `from` to `to`, inclusive, oldest first. Bounded. */
export function occurrenceDates(rule: RecurrenceRule, from: ISODate, to: ISODate): ISODate[] {
  const start = from < rule.startsOn ? rule.startsOn : from
  const end = rule.endsOn !== null && rule.endsOn < to ? rule.endsOn : to
  const out: ISODate[] = []
  const last = Math.min(toDayNumber(end), toDayNumber(start) + MAX_SCAN_DAYS)
  for (let n = toDayNumber(start); n <= last; n++) {
    const date = fromDayNumber(n)
    if (occursOn(rule, date)) out.push(date)
  }
  return out
}

/** The first occurrence strictly after `date`, or null if the series has ended. */
export function nextOccurrence(rule: RecurrenceRule, date: ISODate): ISODate | null {
  const from = addDaysTo(date, 1)
  const start = from < rule.startsOn ? rule.startsOn : from
  for (let n = toDayNumber(start), i = 0; i < MAX_SCAN_DAYS; n++, i++) {
    const d = fromDayNumber(n)
    if (rule.endsOn !== null && d > rule.endsOn) return null
    if (occursOn(rule, d)) return d
  }
  return null
}

/** The last occurrence strictly before `date`, or null. */
export function previousOccurrence(rule: RecurrenceRule, date: ISODate): ISODate | null {
  for (let n = toDayNumber(date) - 1, i = 0; i < MAX_SCAN_DAYS; n--, i++) {
    const d = fromDayNumber(n)
    if (d < rule.startsOn) return null
    if (occursOn(rule, d)) return d
  }
  return null
}

/** The first occurrence on or after `date`. */
export const firstOccurrenceFrom = (rule: RecurrenceRule, date: ISODate): ISODate | null =>
  occursOn(rule, date) ? date : nextOccurrence(rule, date)

// ---------------------------------------------------------------------------
// Time zones
// ---------------------------------------------------------------------------

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

/** The time zone of this device. */
export const deviceTimeZone = (): string => {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    return tz && isValidTimeZone(tz) ? tz : 'UTC'
  } catch {
    return 'UTC'
  }
}

/** The calendar date it is, at moment `at`, in time zone `tz`. */
export function dateInTimeZone(at: Date | string, tz: string): ISODate {
  const when = typeof at === 'string' ? new Date(at) : at
  const zone = isValidTimeZone(tz) ? tz : 'UTC'
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    when,
  )
}

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

/** One occurrence = one series on one date. This is the key used everywhere. */
export const occurrenceKey = (recurrenceId: string, date: ISODate): string => `${recurrenceId}|${date}`

/** The id of an occurrence. The same on every device, so it can never be created twice. */
export const occurrenceId = (recurrenceId: string, date: ISODate): string =>
  deterministicId('occurrence', recurrenceId, date)

// ---------------------------------------------------------------------------
// Words
// ---------------------------------------------------------------------------

const WEEKDAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
export const weekdayName = (n: number) => WEEKDAY_NAMES[n] ?? ''

const unit: Record<RecurrenceFrequency, [string, string]> = {
  daily: ['day', 'days'],
  weekly: ['week', 'weeks'],
  monthly: ['month', 'months'],
}

/** "Daily", "Weekly on Mon, Wed", "Every 2 weeks on Fri", "Monthly on day 15". */
export function describeRule(raw: RecurrenceRule): string {
  const r = normalizeRule(raw)
  const every = r.interval === 1 ? null : `Every ${r.interval} ${unit[r.frequency][1]}`
  if (r.frequency === 'daily') return every ?? 'Daily'
  if (r.frequency === 'weekly') {
    const days = (r.daysOfWeek.length ? r.daysOfWeek : [weekdayOf(r.startsOn)]).map(weekdayName).join(', ')
    return `${every ?? 'Weekly'} on ${days}`
  }
  const day = r.dayOfMonth ?? parts(r.startsOn)[2]
  return `${every ?? 'Monthly'} on day ${day}`
}

/** "Daily commitment" etc., for explanations. */
export const commitmentLabel = (f: RecurrenceFrequency): string =>
  f === 'daily' ? 'Daily commitment' : f === 'weekly' ? 'Weekly commitment' : 'Monthly commitment'
