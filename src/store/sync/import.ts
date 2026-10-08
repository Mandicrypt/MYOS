import { isUuid, newId } from '@/lib/id'
import type { AppState } from '@/types'

/**
 * Prepares data saved on this device for upload to an account.
 *
 * IDs that are already UUIDs are kept. Older IDs (like the sample data's
 * "t-blueprint") become new UUIDs, and every reference to them is updated,
 * including history that points at deleted tasks. Nothing is dropped.
 */
export function prepareImport(state: AppState): AppState {
  const map = new Map<string, string>()
  const id = (value: string): string => {
    if (isUuid(value)) return value
    let mapped = map.get(value)
    if (!mapped) {
      mapped = newId()
      map.set(value, mapped)
    }
    return mapped
  }
  const maybe = (value: string | null | undefined) => (value == null ? value : id(value))

  return {
    ...state,
    goals: state.goals.map((g) => ({ ...g, id: id(g.id) })),
    series: state.series.map((x) => ({
      ...x,
      id: id(x.id),
      projectId: maybe(x.projectId) ?? null,
      goalId: maybe(x.goalId) ?? null,
    })),
    projects: state.projects.map((p) => ({ ...p, id: id(p.id), goalId: maybe(p.goalId) ?? null })),
    milestones: state.milestones.map((m) => ({ ...m, id: id(m.id), projectId: id(m.projectId) })),
    tasks: state.tasks.map((t) => ({
      ...t,
      id: id(t.id),
      projectId: maybe(t.projectId) ?? null,
      goalId: maybe(t.goalId) ?? null,
      milestoneId: maybe(t.milestoneId) ?? null,
      parentId: maybe(t.parentId) ?? null,
      recurrenceId: maybe(t.recurrenceId) ?? null,
      dependsOn: t.dependsOn.map(id),
      noteIds: [],
      checklist: t.checklist.map((c) => ({ ...c })),
    })),
    inbox: state.inbox.map((i) => ({ ...i, id: id(i.id) })),
    notes: state.notes.map((n) => ({
      ...n,
      id: id(n.id),
      projectId: maybe(n.projectId) ?? null,
      goalId: maybe(n.goalId) ?? null,
      taskId: maybe(n.taskId) ?? null,
    })),
    workEvents: state.workEvents.map((e) => ({
      ...e,
      id: id(e.id),
      taskId: id(e.taskId),
      reverses: maybe(e.reverses) ?? undefined,
      projectId: maybe(e.projectId) ?? null,
      goalId: maybe(e.goalId) ?? null,
      recurrenceId: maybe(e.recurrenceId) ?? null,
    })),
    events: state.events.map((e) => ({
      ...e,
      id: id(e.id),
      taskId: e.taskId === null ? null : id(e.taskId),
      // IDs inside event details (e.g. "by", "on") are remapped too, when they were mapped.
      data: e.data
        ? Object.fromEntries(
            Object.entries(e.data).map(([k, v]) => [k, typeof v === 'string' && map.has(v) ? map.get(v)! : v]),
          )
        : e.data,
    })),
  }
}
