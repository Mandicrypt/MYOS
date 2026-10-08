import { toISODate } from '@/lib/dates'
import type { AppState, ID, ISODate, Task } from '@/types'
import { isForToday, suggestable } from './next'
import type { RankedTask } from './types'
import { countedCredits } from './work-history'

/**
 * The Daily Plan: a short list of high-value work that fits the time you have.
 * It does not rank anything itself. It takes the engine's own order
 * (suggestable), puts what you already planned for today first, and fills the
 * day up to your available minutes.
 */

export const PLAN_MAX_ITEMS = 5
/** Assumed length of a task with no estimate. */
export const DEFAULT_TASK_MINUTES = 45

export type PlanItem = {
  task: Task
  /** The single clearest reason, e.g. "Due tomorrow". */
  reason: string
  /** Longer reasons, strongest first. */
  why: string[]
  minutes: number
  status: 'suggested' | 'accepted' | 'done'
}

export type DailyPlan = {
  day: ISODate
  items: PlanItem[]
  minutesPlanned: number
  capacityMinutes: number
  /** More is already planned for today than fits the available time. */
  overloaded: boolean
  /** Every accepted item is done (and at least one was accepted). */
  complete: boolean
}

const localDay = (iso: string): ISODate => toISODate(new Date(iso))
const minutesOf = (t: Task) => t.effortMinutes ?? DEFAULT_TASK_MINUTES

/** What the user decided about plan suggestions on a given day. */
/**
 * Plan decisions made on `day`. Screens use the person's local day (the default);
 * reward scoring passes UTC days so its answer is the same on every device.
 */
export function planDecisions(
  state: AppState,
  day: ISODate,
  dayOf: (iso: string) => ISODate = localDay,
): Map<ID, 'accepted' | 'rejected'> {
  const decisions = new Map<ID, 'accepted' | 'rejected'>()
  for (const e of state.events) {
    if (!e.taskId || dayOf(e.at) !== day) continue
    if (e.type === 'plan.accepted') decisions.set(e.taskId, 'accepted')
    if (e.type === 'plan.rejected') decisions.set(e.taskId, 'rejected')
  }
  return decisions
}

/** Accepted plan tasks all completed that day (counted completions only). */
export function isPlanComplete(state: AppState, day: ISODate, dayOf: (iso: string) => ISODate = localDay): boolean {
  const accepted = [...planDecisions(state, day, dayOf)].filter(([, d]) => d === 'accepted').map(([id]) => id)
  if (!accepted.length) return false
  const doneThatDay = new Set(
    countedCredits(state.workEvents)
      .filter((c) => dayOf(c.at) === day)
      .map((c) => c.taskId),
  )
  return accepted.every((id) => doneThatDay.has(id))
}

function toItem(r: RankedTask, status: PlanItem['status']): PlanItem {
  const why = r.why.filter((w) => w.long && w.weight > 0).map((w) => w.long as string)
  return {
    task: r.task, // The two strongest reasons, like "Due today · Daily commitment".
    reason: r.reasons.slice(0, 2).join(' · ') || 'Planned for today',
    why,
    minutes: minutesOf(r.task),
    status,
  }
}

export function planDay(state: AppState, today: ISODate): DailyPlan {
  const capacity = state.settings.dailyMinutes
  const decisions = planDecisions(state, today)
  const ranked = suggestable(state, today)
  const rankedById = new Map(ranked.map((r) => [r.task.id, r]))

  // Already accepted today: keep them on the plan, done or not.
  const items: PlanItem[] = []
  for (const [id, decision] of decisions) {
    if (decision !== 'accepted') continue
    const task = state.tasks.find((t) => t.id === id)
    if (!task) continue
    const r = rankedById.get(id) ?? { task, score: 0, reasons: [], why: [], blocked: false, suppressed: false }
    items.push(toItem(r, task.status === 'done' ? 'done' : 'accepted'))
  }

  // Then the engine's picks: what you planned for today first, then the rest.
  const candidates = ranked
    .filter((r) => !decisions.has(r.task.id))
    .sort((a, b) => Number(isForToday(b.task, today)) - Number(isForToday(a.task, today)))
  let minutes = items.filter((i) => i.status !== 'done').reduce((sum, i) => sum + i.minutes, 0)
  for (const r of candidates) {
    if (items.length >= PLAN_MAX_ITEMS) break
    const m = minutesOf(r.task)
    // Always offer at least one thing; after that, stay within the day.
    if (items.length > 0 && minutes + m > capacity) continue
    items.push(toItem(r, 'suggested'))
    minutes += m
  }

  const plannedToday = state.tasks.filter((t) => isForToday(t, today)).reduce((sum, t) => sum + minutesOf(t), 0)
  return {
    day: today,
    items,
    minutesPlanned: minutes,
    capacityMinutes: capacity,
    overloaded: plannedToday > capacity,
    complete: isPlanComplete(state, today),
  }
}
