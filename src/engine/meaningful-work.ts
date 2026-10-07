import type { AppState, Task, WorkBreakdown } from '@/types'
import { allDependents, goalOf, projectOf } from './relations'
import { countedCredits } from './work-history'

export const SCORING_VERSION = 2

/**
 * Meaningful work: how much finishing a task actually mattered.
 *
 * points = base × alignment × importance × effort × unblocking × repetition
 *
 * Built so the easy ways to inflate a score don't work:
 * - many tiny tasks: low base, and repeated trivial work in one day is discounted
 * - marking everything important: the bonus shrinks as "important" stops being rare
 * - inflating effort: effort only adds a little, on a capped log curve
 * - fake goals: only active goals count, and alignment is a modest multiplier
 * - work that feeds nothing: no goal or project means a lower multiplier
 */
export function scoreCompletion(
  task: Task,
  state: AppState,
  at: Date = new Date(),
): { points: number; breakdown: WorkBreakdown } {
  const base = task.signals.impact * 4 + task.signals.consequence * 2

  const goal = goalOf(state, task)
  const alignment = goal ? 1.25 : projectOf(state, task) ? 1.1 : 0.85

  const open = state.tasks.filter((t) => t.status === 'open')
  const highShare = open.filter((t) => t.signals.userImportance === 'high').length / Math.max(1, open.length)
  const importance =
    task.signals.userImportance === 'high'
      ? 1 + 0.15 * Math.min(1, 0.25 / Math.max(highShare, 0.25))
      : task.signals.userImportance === 'low'
        ? 0.8
        : 1

  const minutes = task.effortMinutes
  const effort = minutes === null ? 1 : Math.min(1.45, Math.max(0.85, 1 + 0.15 * Math.log2(Math.max(15, minutes) / 30)))

  const unblocking = 1 + 0.1 * Math.min(3, allDependents(state, task).length)

  // Trivial work done in bulk on the same day is worth less each time.
  const trivial = task.signals.impact <= 2
  const day = at.toISOString().slice(0, 10)
  const trivialToday = countedCredits(state.workEvents).filter((e) => {
    if (e.at.slice(0, 10) !== day) return false
    const impact = e.impact ?? state.tasks.find((x) => x.id === e.taskId)?.signals.impact
    return impact !== undefined && impact <= 2
  }).length
  const repetition = !trivial ? 1 : trivialToday < 3 ? 1 : trivialToday < 6 ? 0.5 : 0.25

  const raw = base * alignment * importance * effort * unblocking * repetition
  const round = (n: number) => Math.round(n * 100) / 100
  return {
    points: Math.max(1, Math.round(raw)),
    breakdown: {
      base,
      alignment: round(alignment),
      importance: round(importance),
      effort: round(effort),
      unblocking: round(unblocking),
      repetition,
    },
  }
}

/** Kept for existing callers. */
export function meaningfulPoints(task: Task, state: AppState): number {
  return scoreCompletion(task, state).points
}
