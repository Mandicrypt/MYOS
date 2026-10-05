import { addDays, daysBetween } from '@/lib/dates'
import type { AppState, Goal, ID, ISODate, Project, Task } from '@/types'
import { goalIdOf } from './relations'

/**
 * Goals, derived from real work. Nothing here is typed in by the user:
 * progress is simply how much of a goal's linked work is done.
 */

/** Projects that serve this goal. */
export function projectsForGoal(state: AppState, goalId: ID): Project[] {
  return state.projects.filter((p) => p.goalId === goalId)
}

/** Tasks that serve this goal, by the one rule in goalIdOf (direct link first, then project). */
export function tasksForGoal(state: AppState, goalId: ID): Task[] {
  return state.tasks.filter((t) => goalIdOf(state, t) === goalId)
}

export type GoalProgress = {
  done: number
  total: number
  /** 0–100, or null when the goal has no linked tasks yet. */
  percent: number | null
}

/**
 * Share of linked tasks completed, as of a moment (default: now).
 * Measuring the past uses each task's completedAt against today's set of tasks,
 * so "how much moved this week" is a fair comparison.
 */
export function goalProgress(state: AppState, goalId: ID, asOf?: string): GoalProgress {
  const tasks = tasksForGoal(state, goalId)
  const done = tasks.filter(
    (t) => t.status === 'done' && (!asOf || (t.completedAt !== null && t.completedAt < asOf)),
  ).length
  return { done, total: tasks.length, percent: tasks.length ? Math.round((done / tasks.length) * 100) : null }
}

/** How many percentage points a goal moved between two moments. */
export function goalProgressChange(state: AppState, goalId: ID, from: string, to: string): number {
  const before = goalProgress(state, goalId, from).percent ?? 0
  const after = goalProgress(state, goalId, to).percent ?? 0
  return after - before
}

/** Days until a goal's target date (negative if passed), or null. */
export function daysToTarget(goal: Goal, today: ISODate): number | null {
  return goal.targetDate ? daysBetween(today, goal.targetDate) : null
}

/** Active goals first, then paused, completed, archived; within each, nearest target first. */
export function sortGoals(goals: Goal[], today: ISODate): Goal[] {
  const order = { active: 0, paused: 1, completed: 2, archived: 3 }
  const far = addDays(today, 100000)
  return [...goals].sort(
    (a, b) => order[a.status] - order[b.status] || (a.targetDate ?? far).localeCompare(b.targetDate ?? far),
  )
}
