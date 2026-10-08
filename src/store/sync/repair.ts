import { occurrenceKey } from '@/engine/recurrence'
import type { AppState, Task } from '@/types'

/**
 * Clears links that point at records which no longer exist, and removes duplicate
 * recurring occurrences.
 *
 * Two devices can disagree: one deletes a task while the other, offline, edits a note linked
 * to it. The database would refuse that link, and sync would fail every time. Clearing it keeps
 * the record and lets sync go on. History (work and user events) is never touched.
 */
export function repairReferences(state: AppState): AppState {
  const goals = new Set(state.goals.map((g) => g.id))
  const projects = new Set(state.projects.map((p) => p.id))
  const tasks = new Set(state.tasks.map((t) => t.id))
  const seriesIds = new Set(state.series.map((s) => s.id))

  const keep = (id: string | null, existing: Set<string>) => (id && existing.has(id) ? id : null)
  let changed = false
  const mark = <T>(before: T, after: T): T => {
    if (before !== after) changed = true
    return after
  }

  const nextSeries = state.series.map((s) => {
    const fixed = { ...s, projectId: keep(s.projectId, projects), goalId: keep(s.goalId, goals) }
    return fixed.projectId === s.projectId && fixed.goalId === s.goalId ? s : mark(s, fixed)
  })
  const nextProjects = state.projects.map((p) =>
    p.goalId && !goals.has(p.goalId) ? mark(p, { ...p, goalId: null }) : p,
  )
  // A milestone can't exist without its project (the database removes it too).
  const nextMilestones = state.milestones.filter((m) => {
    const ok = projects.has(m.projectId)
    if (!ok) changed = true
    return ok
  })
  const milestones = new Set(nextMilestones.map((m) => m.id))

  // One occurrence per series per day. If two exist (made by different versions or devices),
  // keep the one that matters most: finished, then skipped, then open; then the oldest.
  const rank: Record<Task['status'], number> = { done: 0, skipped: 1, open: 2 }
  const best = new Map<string, Task>()
  for (const t of state.tasks) {
    if (!t.recurrenceId || !t.occurrenceDate) continue
    const key = occurrenceKey(t.recurrenceId, t.occurrenceDate)
    const current = best.get(key)
    if (
      !current ||
      rank[t.status] < rank[current.status] ||
      (rank[t.status] === rank[current.status] && t.createdAt < current.createdAt)
    )
      best.set(key, t)
  }
  const dropped = new Set<string>()
  for (const t of state.tasks) {
    if (!t.recurrenceId || !t.occurrenceDate) continue
    if (best.get(occurrenceKey(t.recurrenceId, t.occurrenceDate))!.id !== t.id) {
      dropped.add(t.id)
      changed = true
    }
  }

  const nextTasks = state.tasks
    .filter((t) => !dropped.has(t.id))
    .map((t) => {
      const orphaned = t.recurrenceId !== null && !seriesIds.has(t.recurrenceId)
      const fixed = {
        ...t,
        projectId: keep(t.projectId, projects),
        goalId: keep(t.goalId, goals),
        milestoneId: keep(t.milestoneId, milestones),
        parentId: keep(t.parentId, tasks),
        dependsOn: t.dependsOn.filter((d) => tasks.has(d) && !dropped.has(d)),
        // A series deleted elsewhere: its occurrences carry on as ordinary tasks.
        recurrenceId: orphaned ? null : t.recurrenceId,
        occurrenceDate: orphaned ? null : t.occurrenceDate,
      }
      const same =
        fixed.projectId === t.projectId &&
        fixed.goalId === t.goalId &&
        fixed.milestoneId === t.milestoneId &&
        fixed.parentId === t.parentId &&
        fixed.dependsOn.length === t.dependsOn.length &&
        fixed.recurrenceId === t.recurrenceId
      return same ? t : mark(t, fixed)
    })
  const liveTasks = new Set(nextTasks.map((t) => t.id))
  const nextNotes = state.notes.map((n) => {
    const fixed = {
      ...n,
      projectId: keep(n.projectId, projects),
      goalId: keep(n.goalId, goals),
      taskId: keep(n.taskId, liveTasks),
    }
    const same = fixed.projectId === n.projectId && fixed.goalId === n.goalId && fixed.taskId === n.taskId
    return same ? n : mark(n, fixed)
  })

  return changed
    ? {
        ...state,
        series: nextSeries,
        projects: nextProjects,
        milestones: nextMilestones,
        tasks: nextTasks,
        notes: nextNotes,
      }
    : state
}
