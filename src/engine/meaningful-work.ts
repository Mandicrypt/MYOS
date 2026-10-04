import type { AppState, Task } from '@/types'

/**
 * Points for finishing a task, based on how much it mattered.
 * Many small trivial tasks earn little, so there's nothing to gain from farming.
 */
export function meaningfulPoints(task: Task, state: AppState): number {
  const project = state.projects.find((p) => p.id === task.projectId)
  const aligned = Boolean(task.goalId || project?.goalId)
  const importance = { low: 0.7, normal: 1, high: 1.2 }[task.signals.userImportance]
  const base = task.signals.impact * 3 + task.signals.consequence * 1.5
  return Math.max(1, Math.round(base * (aligned ? 1.2 : 0.8) * importance))
}
