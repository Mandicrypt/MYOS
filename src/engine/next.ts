import { daysBetween } from '@/lib/dates'
import type { AppState, ID, ISODate, Task } from '@/types'
import { engine } from './importance'
import { projectOf } from './relations'
import type { RankedTask } from './types'

export type NextSuggestion = {
  ranked: RankedTask
  /** Why this is the best move right after finishing something. */
  note: string | null
}

/**
 * Planned for today, or overdue / due today with no other plan.
 * If the user moved it to a later day, that choice wins over the deadline.
 */
export function isForToday(task: Task, today: ISODate): boolean {
  if (task.status !== 'open') return false
  if (task.plannedFor) return task.plannedFor <= today
  return Boolean(task.dueOn && task.dueOn <= today)
}

/** The user has pushed this to a later day. */
function deferred(task: Task, today: ISODate): boolean {
  return Boolean(task.plannedFor && task.plannedFor > today)
}

/** Ranked, actionable tasks MYOS is allowed to suggest. */
export function suggestable(state: AppState, today: ISODate): RankedTask[] {
  return engine
    .rank(
      state.tasks.filter((t) => t.status === 'open'),
      { state, today },
    )
    .filter((r) => !r.blocked && !r.suppressed)
}

/**
 * What makes the most sense right after finishing `completed`.
 * Not "the next task in the list": work that was just unblocked, or that
 * continues the same project, gets a boost, then the normal ranking decides.
 */
export function suggestNext(
  state: AppState,
  today: ISODate,
  completed: Task,
  unblockedIds: ID[],
): NextSuggestion | null {
  const candidates = suggestable(state, today).filter(
    (r) =>
      isForToday(r.task, today) ||
      (!deferred(r.task, today) &&
        (unblockedIds.includes(r.task.id) || (r.task.dueOn && daysBetween(today, r.task.dueOn) <= 1))),
  )
  const pool = candidates.length ? candidates : suggestable(state, today)
  if (!pool.length) return null

  const project = projectOf(state, completed)
  const adjusted = pool
    .map((r) => {
      let bonus = 0
      if (unblockedIds.includes(r.task.id)) bonus += 6
      if (project && r.task.projectId === project.id) bonus += 2.5
      return { r, total: r.score + bonus }
    })
    .sort((a, b) => b.total - a.total)

  const best = adjusted[0].r
  let note: string | null = null
  if (unblockedIds.includes(best.task.id)) note = 'You just made this possible.'
  else if (project && best.task.projectId === project.id) note = `Keeps ${project.title} moving while you're in it.`
  return { ranked: best, note }
}
