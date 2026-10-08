import { addDaysTo, occursOn, weekdayOf } from '@/engine/recurrence'
import { toISODate } from '@/lib/dates'
import { countedCredits } from '@/engine/work-history'
import type { AppState, ID, ISODate, Task, TaskSeries } from '@/types'

/**
 * How routines (recurring tasks) are going. Everything here is derived from real
 * occurrences and the series' own rule. Nothing is stored, nothing is invented.
 */

/** What happened (or still can) for one series on one day. */
export type OccurrenceStatus = 'done' | 'skipped' | 'missed' | 'open'

/** A goal's day, across all its routines. */
export type DayState = 'done' | 'partial' | 'missed' | 'skipped' | 'open' | 'none'

const STREAK_LOOKBACK_DAYS = 400

/** The series that serve a goal: linked directly, or through their project's goal. */
export function seriesOfGoal(state: AppState, goalId: ID): TaskSeries[] {
  return state.series.filter((s) => {
    const projectGoal = s.projectId ? state.projects.find((p) => p.id === s.projectId)?.goalId : null
    return (s.goalId ?? projectGoal ?? null) === goalId
  })
}

const occurrencesByDate = (state: AppState, seriesId: ID): Map<ISODate, Task> => {
  const map = new Map<ISODate, Task>()
  for (const t of state.tasks) if (t.recurrenceId === seriesId && t.occurrenceDate) map.set(t.occurrenceDate, t)
  return map
}

/**
 * Null when nothing was expected that day. A day with no occurrence yet but one due by the rule
 * counts as expected, so days the app wasn't opened still show up as missed.
 */
export function occurrenceStatusOn(
  series: TaskSeries,
  date: ISODate,
  today: ISODate,
  byDate: Map<ISODate, Task>,
): OccurrenceStatus | null {
  const occ = byDate.get(date)
  const expected = occ !== undefined || (series.active && occursOn(series, date))
  if (!expected) return null
  if (occ?.status === 'done') return 'done'
  if (occ?.status === 'skipped') return 'skipped'
  // Still open (or not made yet). It is missed once its day, and any day it was moved to, has passed.
  const movedLater = occ !== undefined && occ.plannedFor !== null && occ.plannedFor >= today
  return date < today && !movedLater ? 'missed' : 'open'
}

/** Missed days for one series in the last 7 days (not counting today). */
export function missedCount(state: AppState, series: TaskSeries, today: ISODate): number {
  const byDate = occurrencesByDate(state, series.id)
  let n = 0
  for (let i = 1; i <= 7; i++) if (occurrenceStatusOn(series, addDaysTo(today, -i), today, byDate) === 'missed') n++
  return n
}

type DayCounts = { state: DayState; expected: number; done: number; skipped: number; missed: number; open: number }

function dayCounts(statuses: OccurrenceStatus[]): DayCounts {
  const c = { expected: statuses.length, done: 0, skipped: 0, missed: 0, open: 0 }
  for (const s of statuses) c[s]++
  const state: DayState =
    c.expected === 0
      ? 'none'
      : c.done === c.expected
        ? 'done'
        : c.done > 0
          ? 'partial'
          : c.skipped === c.expected
            ? 'skipped'
            : c.missed > 0
              ? 'missed'
              : 'open'
  return { state, ...c }
}

/** A lookup for "how did these series do on this day", built once. */
function dayLookup(state: AppState, series: TaskSeries[], today: ISODate) {
  const maps = series.map((s) => [s, occurrencesByDate(state, s.id)] as const)
  return (date: ISODate): DayCounts =>
    dayCounts(
      maps.flatMap(([s, byDate]) => {
        const st = occurrenceStatusOn(s, date, today, byDate)
        return st ? [st] : []
      }),
    )
}

export type GoalDay = DayCounts & { date: ISODate }

/** Each day from `from` to `to` for a goal's routines. */
export function goalDays(state: AppState, goalId: ID, from: ISODate, to: ISODate, today: ISODate): GoalDay[] {
  const lookup = dayLookup(state, seriesOfGoal(state, goalId), today)
  const out: GoalDay[] = []
  for (let d = from, i = 0; d <= to && i < 800; d = addDaysTo(d, 1), i++) out.push({ date: d, ...lookup(d) })
  return out
}

export type GoalConsistency = {
  /** Routines that are still repeating. */
  activeRoutines: number
  today: { done: number; total: number }
  /** Days this week (Monday to today) on which every routine was done, out of days that had any. */
  week: { complete: number; of: number }
  /** Days in a row, ending today or yesterday, on which every routine was done. */
  streak: number
  lastCompleted: ISODate | null
}

export function goalConsistency(state: AppState, goalId: ID, today: ISODate): GoalConsistency {
  const series = seriesOfGoal(state, goalId)
  const lookup = dayLookup(state, series, today)

  const now = lookup(today)
  const weekStart = addDaysTo(today, -weekdayOf(today))
  let complete = 0
  let of = 0
  for (let d = weekStart; d <= today; d = addDaysTo(d, 1)) {
    const day = lookup(d)
    if (day.expected === 0) continue
    of++
    if (day.state === 'done') complete++
  }

  // Days with nothing expected are skipped over. Today, if still unfinished, neither counts nor breaks the streak.
  let streak = 0
  for (let n = 0; n < STREAK_LOOKBACK_DAYS; n++) {
    const day = lookup(addDaysTo(today, -n))
    if (day.expected === 0) continue
    if (day.state === 'done') streak++
    else if (n === 0) continue
    else break
  }

  // The day it was done, in the routine's own timezone when we know it (so it never shifts with the device's).
  const ids = new Set(series.map((s) => s.id))
  const days = countedCredits(state.workEvents)
    .filter((e) => e.recurrenceId && ids.has(e.recurrenceId))
    .map((e) => e.localDay ?? toISODate(new Date(e.at)))
  const last = days.sort().at(-1)

  return {
    activeRoutines: series.filter((s) => s.active).length,
    today: { done: now.done, total: now.expected },
    week: { complete, of },
    streak,
    lastCompleted: last ?? null,
  }
}

export type RoutineWeek = { series: TaskSeries; done: number; expected: number; skipped: number; missed: number }

/** How each routine did in the week starting `weekStart` (up to today, for the current week). */
export function routinesForWeek(state: AppState, weekStart: ISODate, today: ISODate): RoutineWeek[] {
  const weekEnd = addDaysTo(weekStart, 6)
  const last = weekEnd < today ? weekEnd : today
  const out: RoutineWeek[] = []
  for (const series of state.series) {
    const byDate = occurrencesByDate(state, series.id)
    const row = { series, done: 0, expected: 0, skipped: 0, missed: 0 }
    for (let d = weekStart; d <= last; d = addDaysTo(d, 1)) {
      const st = occurrenceStatusOn(series, d, today, byDate)
      if (!st) continue
      row.expected++
      if (st === 'done') row.done++
      else if (st === 'skipped') row.skipped++
      else if (st === 'missed') row.missed++
    }
    if (row.expected > 0) out.push(row)
  }
  return out.sort((a, b) => a.series.title.localeCompare(b.series.title))
}

/** An open occurrence whose day (and any day the user moved it to) has passed. It stays in history, not in today. */
export function isMissedOccurrence(task: Task, today: ISODate): boolean {
  return (
    task.recurrenceId !== null &&
    task.occurrenceDate !== null &&
    task.status === 'open' &&
    task.occurrenceDate < today &&
    (task.plannedFor === null || task.plannedFor < today)
  )
}
