import {
  addDaysTo,
  dateInTimeZone,
  deviceTimeZone,
  firstOccurrenceFrom,
  normalizeRule,
  occurrenceDates,
  occurrenceId,
  occurrenceKey,
  occursOn,
  type RecurrenceRule,
} from '@/engine/recurrence'
import type { AppState, ID, ISODate, Task, TaskSeries } from '@/types'

/**
 * Recurring tasks as data. A series is one rule plus a template; an occurrence is an
 * ordinary Task that points at its series and its date. Occurrences are made lazily,
 * only for a small window around today, and making them is idempotent:
 * the same series and date always give the same id, so nothing is ever created twice.
 */

/** How many past days are filled in when MYOS wasn't opened (so missed days stay visible). */
export const CATCH_UP_DAYS = 6
/** How many days ahead occurrences are prepared. */
export const LOOKAHEAD_DAYS = 1

export type SeriesTemplate = Pick<
  TaskSeries,
  'title' | 'description' | 'projectId' | 'goalId' | 'effortMinutes' | 'signals' | 'checklist' | 'links'
>

/** The calendar date it is for this series right now (in the series' own timezone). */
export const seriesToday = (series: Pick<TaskSeries, 'timezone'>, now: Date): ISODate =>
  dateInTimeZone(now, series.timezone)

const stamp = (date: ISODate) => `${date}T00:00:00.000Z`

/**
 * One occurrence, built from the series template. Its timestamps come from its date,
 * not from the clock, so two devices that make it produce identical rows,
 * and any real edit (completing it, say) is always newer.
 */
export function occurrenceTask(series: TaskSeries, date: ISODate): Task {
  return {
    id: occurrenceId(series.id, date),
    title: series.title,
    description: series.description,
    status: 'open',
    projectId: series.projectId,
    goalId: series.goalId,
    milestoneId: null,
    plannedFor: date,
    dueOn: date,
    effortMinutes: series.effortMinutes,
    signals: { ...series.signals },
    // Occurrences start with no dependencies: "after that task" has no stable meaning for a repeating one.
    dependsOn: [],
    checklist: series.checklist.map((c) => ({ ...c, done: false })),
    links: series.links.map((l) => ({ ...l })),
    noteIds: [],
    suppressed: false,
    postponeCount: 0,
    origin: 'user',
    parentId: null,
    recurrenceId: series.id,
    occurrenceDate: date,
    createdAt: stamp(date),
    updatedAt: stamp(date),
    completedAt: null,
  }
}

/** Occurrences that were ever completed. They are never re-made, even if the task was deleted. */
export function creditedOccurrenceKeys(state: AppState): Set<string> {
  const keys = new Set<string>()
  for (const e of state.workEvents)
    if ((e.kind ?? 'credit') === 'credit' && e.recurrenceId && e.occurrenceDate)
      keys.add(occurrenceKey(e.recurrenceId, e.occurrenceDate))
  return keys
}

const existingKeys = (state: AppState): Set<string> =>
  new Set(
    state.tasks
      .filter((t) => t.recurrenceId && t.occurrenceDate)
      .map((t) => occurrenceKey(t.recurrenceId!, t.occurrenceDate!)),
  )

/**
 * Makes any occurrences that should exist but don't. Safe to call as often as you like:
 * if nothing is missing it returns the very same state object.
 */
export function ensureOccurrences(state: AppState, now: Date = new Date()): AppState {
  if (!state.series.length) return state
  const have = existingKeys(state)
  const credited = creditedOccurrenceKeys(state)
  const made: Task[] = []
  for (const series of state.series) {
    if (!series.active) continue
    const today = seriesToday(series, now)
    const from = addDaysTo(today, -CATCH_UP_DAYS)
    const to = addDaysTo(today, LOOKAHEAD_DAYS)
    for (const date of occurrenceDates(series, from, to)) {
      const key = occurrenceKey(series.id, date)
      if (have.has(key) || credited.has(key)) continue
      have.add(key)
      made.push(occurrenceTask(series, date))
    }
  }
  return made.length ? { ...state, tasks: [...state.tasks, ...made] } : state
}

export type NewSeriesInput = { id: ID; fromTaskId: ID; rule: RecurrenceRule; timezone?: string }

/**
 * Turns a task into the first occurrence of a new series. The task keeps its identity,
 * history and notes; the series takes its details as the template.
 */
export function createSeries(state: AppState, input: NewSeriesInput, now: Date = new Date()): AppState {
  const task = state.tasks.find((t) => t.id === input.fromTaskId)
  if (!task || task.recurrenceId || task.status !== 'open') return state
  const rule = normalizeRule(input.rule)
  const first = firstOccurrenceFrom(rule, rule.startsOn)
  if (!first) return state
  const series: TaskSeries = {
    id: input.id,
    title: task.title,
    description: task.description,
    projectId: task.projectId,
    goalId: task.goalId,
    effortMinutes: task.effortMinutes,
    signals: { ...task.signals },
    checklist: task.checklist.map((c) => ({ ...c, done: false })),
    links: task.links.map((l) => ({ ...l })),
    ...rule,
    timezone: input.timezone ?? deviceTimeZone(),
    active: true,
    createdAt: now.toISOString(),
  }
  const next: AppState = {
    ...state,
    series: [...state.series, series],
    tasks: state.tasks.map((t) =>
      t.id === task.id ? { ...t, recurrenceId: series.id, occurrenceDate: first, plannedFor: first, dueOn: first } : t,
    ),
  }
  return ensureOccurrences(next, now)
}

const applyTemplate = (t: Task, s: TaskSeries, withChecklist: boolean): Task => ({
  ...t,
  title: s.title,
  description: s.description,
  projectId: s.projectId,
  goalId: s.goalId,
  effortMinutes: s.effortMinutes,
  signals: { ...s.signals },
  links: s.links.map((l) => ({ ...l })),
  checklist: withChecklist ? s.checklist.map((c) => ({ ...c, done: false })) : t.checklist,
})

export type SeriesPatch = { template?: Partial<SeriesTemplate>; rule?: Partial<RecurrenceRule>; timezone?: string }

/**
 * Changes the whole series. Past and finished occurrences are never touched.
 * Open occurrences from today on follow the new details; any that no longer fit
 * the new pattern are removed, and missing ones are made.
 */
export function updateSeries(state: AppState, id: ID, patch: SeriesPatch, now: Date = new Date()): AppState {
  const old = state.series.find((s) => s.id === id)
  if (!old) return state
  // Only the rule's own fields are merged here (not the whole series), so a template change isn't undone.
  const rule = normalizeRule({
    frequency: old.frequency,
    interval: old.interval,
    daysOfWeek: old.daysOfWeek,
    dayOfMonth: old.dayOfMonth,
    startsOn: old.startsOn,
    endsOn: old.endsOn,
    ...(patch.rule ?? {}),
  })
  const next: TaskSeries = {
    ...old,
    ...(patch.template ?? {}),
    ...rule,
    timezone: patch.timezone ?? old.timezone,
  }
  const today = seriesToday(next, now)
  const tasks = state.tasks.flatMap((t) => {
    if (t.recurrenceId !== id) return [t]
    if (t.status !== 'open' || t.occurrenceDate! < today) return [t]
    if (!occursOn(next, t.occurrenceDate!)) return []
    return [applyTemplate(t, next, Boolean(patch.template?.checklist))]
  })
  return ensureOccurrences({ ...state, series: state.series.map((s) => (s.id === id ? next : s)), tasks }, now)
}

/** Stops repeating: no new occurrences; today's stays, later open ones go. History is kept. */
export function stopSeries(state: AppState, id: ID, now: Date = new Date()): AppState {
  const series = state.series.find((s) => s.id === id)
  if (!series) return state
  const today = seriesToday(series, now)
  return {
    ...state,
    series: state.series.map((s) => (s.id === id ? { ...s, active: false } : s)),
    tasks: state.tasks.filter((t) => !(t.recurrenceId === id && t.status === 'open' && t.occurrenceDate! > today)),
  }
}

/** Removes the series. Open occurrences go; finished ones stay as ordinary tasks. */
export function deleteSeries(state: AppState, id: ID): AppState {
  if (!state.series.some((s) => s.id === id)) return state
  return {
    ...state,
    series: state.series.filter((s) => s.id !== id),
    tasks: state.tasks.flatMap((t) => {
      if (t.recurrenceId !== id) return [t]
      if (t.status === 'open') return []
      return [{ ...t, recurrenceId: null, occurrenceDate: null }]
    }),
  }
}

/** Skips one occurrence. The series carries on; nothing is earned; it stays in history. */
export function skipOccurrence(state: AppState, taskId: ID): AppState {
  const task = state.tasks.find((t) => t.id === taskId)
  if (!task || !task.recurrenceId || task.status !== 'open') return state
  return {
    ...state,
    tasks: state.tasks.map((t) => (t.id === taskId ? { ...t, status: 'skipped', completedAt: null } : t)),
  }
}

/** Has this occurrence ever been completed (so a second completion must earn nothing)? */
export const occurrenceWasCredited = (state: AppState, task: Task): boolean =>
  task.recurrenceId !== null &&
  task.occurrenceDate !== null &&
  creditedOccurrenceKeys(state).has(occurrenceKey(task.recurrenceId, task.occurrenceDate))
