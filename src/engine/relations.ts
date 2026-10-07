import type { AppState, Goal, Milestone, Project, Task } from '@/types'

/** The work hierarchy: Goal → Project → Milestone → Task. */

export function projectOf(state: AppState, task: Task): Project | undefined {
  return task.projectId ? state.projects.find((p) => p.id === task.projectId) : undefined
}

export function milestoneOf(state: AppState, task: Task): Milestone | undefined {
  return task.milestoneId ? state.milestones.find((m) => m.id === task.milestoneId) : undefined
}

/**
 * The one rule for which goal a task serves: its direct goal if it has one,
 * otherwise its project's goal. A task always serves at most one goal.
 * Every screen and calculation goes through this (or goalOf, below).
 */
export function goalIdOf(state: AppState, task: Task): string | null {
  return task.goalId ?? projectOf(state, task)?.goalId ?? null
}

/** The task's goal, only if that goal is active. Used for priorities and scoring. */
export function goalOf(state: AppState, task: Task): Goal | undefined {
  const id = goalIdOf(state, task)
  const goal = id ? state.goals.find((g) => g.id === id) : undefined
  return goal?.status === 'active' ? goal : undefined
}

export function openDependencies(state: AppState, task: Task): Task[] {
  return task.dependsOn
    .map((id) => state.tasks.find((t) => t.id === id))
    .filter((t): t is Task => Boolean(t && t.status === 'open'))
}

export function isBlocked(state: AppState, task: Task): boolean {
  return Boolean(task.waitingOn) || openDependencies(state, task).length > 0
}

/** Open tasks that wait on this one directly. */
export function directDependents(state: AppState, task: Task): Task[] {
  return state.tasks.filter((t) => t.status === 'open' && t.dependsOn.includes(task.id))
}

/** Every open task held up by this one, however many steps away. */
export function allDependents(state: AppState, task: Task): Task[] {
  const seen = new Map<string, Task>()
  const queue = [task]
  while (queue.length) {
    const current = queue.shift()!
    for (const dep of directDependents(state, current)) {
      if (!seen.has(dep.id) && dep.id !== task.id) {
        seen.set(dep.id, dep)
        queue.push(dep)
      }
    }
  }
  return [...seen.values()]
}

/** True if adding `dependsOnId` to `task` would create a loop. */
export function wouldCreateCycle(state: AppState, taskId: string, dependsOnId: string): boolean {
  if (taskId === dependsOnId) return true
  const target = state.tasks.find((t) => t.id === dependsOnId)
  if (!target) return false
  const visit = (t: Task, seen: Set<string>): boolean => {
    if (t.id === taskId) return true
    if (seen.has(t.id)) return false
    seen.add(t.id)
    return t.dependsOn.some((id) => {
      const next = state.tasks.find((x) => x.id === id)
      return next ? visit(next, seen) : false
    })
  }
  return visit(target, new Set())
}

/** Tasks that were waiting only on `completedId` and can now start. */
export function newlyUnblockedBy(before: AppState, after: AppState, completedId: string): Task[] {
  const wasBlocked = new Set(
    before.tasks
      .filter((t) => t.status === 'open' && t.dependsOn.includes(completedId) && isBlocked(before, t))
      .map((t) => t.id),
  )
  return after.tasks.filter((t) => wasBlocked.has(t.id) && t.status === 'open' && !isBlocked(after, t))
}
