import type { AppState } from '@/types'

/**
 * Clears links that point at records which no longer exist.
 *
 * This happens when two devices disagree: one deletes a task while the other,
 * offline, edits a note linked to it. The database would refuse that link, and
 * sync would fail every time. Clearing it keeps the record and lets sync go on.
 * History (work and user events) is never touched: it may refer to deleted records on purpose.
 */
export function repairReferences(state: AppState): AppState {
  const goals = new Set(state.goals.map((g) => g.id))
  const projects = new Set(state.projects.map((p) => p.id))
  const tasks = new Set(state.tasks.map((t) => t.id))

  const keep = (id: string | null, existing: Set<string>) => (id && existing.has(id) ? id : null)
  let changed = false
  const mark = <T>(before: T, after: T): T => {
    if (before !== after) changed = true
    return after
  }

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
  const nextTasks = state.tasks.map((t) => {
    const fixed = {
      ...t,
      projectId: keep(t.projectId, projects),
      goalId: keep(t.goalId, goals),
      milestoneId: keep(t.milestoneId, milestones),
      parentId: keep(t.parentId, tasks),
      dependsOn: t.dependsOn.filter((d) => tasks.has(d)),
    }
    const same =
      fixed.projectId === t.projectId &&
      fixed.goalId === t.goalId &&
      fixed.milestoneId === t.milestoneId &&
      fixed.parentId === t.parentId &&
      fixed.dependsOn.length === t.dependsOn.length
    return same ? t : mark(t, fixed)
  })
  const nextNotes = state.notes.map((n) => {
    const fixed = {
      ...n,
      projectId: keep(n.projectId, projects),
      goalId: keep(n.goalId, goals),
      taskId: keep(n.taskId, tasks),
    }
    const same = fixed.projectId === n.projectId && fixed.goalId === n.goalId && fixed.taskId === n.taskId
    return same ? n : mark(n, fixed)
  })

  return changed
    ? { ...state, projects: nextProjects, milestones: nextMilestones, tasks: nextTasks, notes: nextNotes }
    : state
}
