import type { AppState, Goal, InboxItem, Milestone, Note, Project, Settings, Task, UserEvent, WorkEvent } from '@/types'

/**
 * Converting between MYOS records (camelCase) and database rows (snake_case).
 * Nothing outside the cloud folder sees row shapes.
 */

export type Row = Record<string, unknown>

/** Postgres returns "2026-10-05T00:05:29.808+00:00"; MYOS uses "...Z". */
const ts = (v: unknown): string => new Date(String(v)).toISOString()
const tsOrNull = (v: unknown): string | null => (v == null ? null : ts(v))
const str = (v: unknown): string => (v == null ? '' : String(v))
const strOrNull = (v: unknown): string | null => (v == null ? null : String(v))
const optional = (v: unknown): string | undefined => (v == null ? undefined : String(v))

export const goalToRow = (g: Goal, userId: string): Row => ({
  id: g.id,
  user_id: userId,
  title: g.title,
  why: g.why,
  status: g.status,
  created_at: g.createdAt,
  updated_at: g.updatedAt ?? g.createdAt,
})
export const rowToGoal = (r: Row): Goal => ({
  id: str(r.id),
  title: str(r.title),
  why: str(r.why),
  status: r.status as Goal['status'],
  createdAt: ts(r.created_at),
  updatedAt: ts(r.updated_at),
})

export const projectToRow = (p: Project, userId: string): Row => ({
  id: p.id,
  user_id: userId,
  title: p.title,
  summary: p.summary,
  goal_id: p.goalId,
  status: p.status,
  deadline: p.deadline,
  created_at: p.createdAt,
  updated_at: p.updatedAt ?? p.createdAt,
})
export const rowToProject = (r: Row): Project => ({
  id: str(r.id),
  title: str(r.title),
  summary: str(r.summary),
  goalId: strOrNull(r.goal_id),
  status: r.status as Project['status'],
  deadline: strOrNull(r.deadline),
  createdAt: ts(r.created_at),
  updatedAt: ts(r.updated_at),
})

export const milestoneToRow = (m: Milestone, userId: string, fallbackTime: string): Row => ({
  id: m.id,
  user_id: userId,
  project_id: m.projectId,
  title: m.title,
  due_on: m.dueOn,
  done: m.done,
  created_at: m.createdAt ?? fallbackTime,
  updated_at: m.updatedAt ?? m.createdAt ?? fallbackTime,
})
export const rowToMilestone = (r: Row): Milestone => ({
  id: str(r.id),
  projectId: str(r.project_id),
  title: str(r.title),
  dueOn: strOrNull(r.due_on),
  done: Boolean(r.done),
  createdAt: ts(r.created_at),
  updatedAt: ts(r.updated_at),
})

export const taskToRow = (t: Task, userId: string): Row => ({
  id: t.id,
  user_id: userId,
  title: t.title,
  description: t.description ?? null,
  status: t.status,
  project_id: t.projectId,
  goal_id: t.goalId,
  milestone_id: t.milestoneId,
  planned_for: t.plannedFor,
  due_on: t.dueOn,
  effort_minutes: t.effortMinutes,
  impact: t.signals.impact,
  consequence: t.signals.consequence,
  user_importance: t.signals.userImportance,
  depends_on: t.dependsOn,
  waiting_on: t.waitingOn ?? null,
  checklist: t.checklist,
  links: t.links,
  note_ids: t.noteIds,
  outcome: t.outcome ?? null,
  suppressed: t.suppressed,
  postpone_count: t.postponeCount,
  origin: t.origin,
  parent_id: t.parentId,
  created_at: t.createdAt,
  updated_at: t.updatedAt ?? t.createdAt,
  completed_at: t.completedAt,
})
export const rowToTask = (r: Row): Task => ({
  id: str(r.id),
  title: str(r.title),
  description: optional(r.description),
  status: r.status as Task['status'],
  projectId: strOrNull(r.project_id),
  goalId: strOrNull(r.goal_id),
  milestoneId: strOrNull(r.milestone_id),
  plannedFor: strOrNull(r.planned_for),
  dueOn: strOrNull(r.due_on),
  effortMinutes: r.effort_minutes == null ? null : Number(r.effort_minutes),
  signals: {
    impact: Number(r.impact) as Task['signals']['impact'],
    consequence: Number(r.consequence) as Task['signals']['consequence'],
    userImportance: r.user_importance as Task['signals']['userImportance'],
  },
  dependsOn: (r.depends_on as string[] | null) ?? [],
  waitingOn: optional(r.waiting_on),
  checklist: (r.checklist as Task['checklist'] | null) ?? [],
  links: (r.links as Task['links'] | null) ?? [],
  noteIds: (r.note_ids as string[] | null) ?? [],
  outcome: optional(r.outcome),
  suppressed: Boolean(r.suppressed),
  postponeCount: Number(r.postpone_count ?? 0),
  origin: r.origin as Task['origin'],
  parentId: strOrNull(r.parent_id),
  createdAt: ts(r.created_at),
  updatedAt: ts(r.updated_at),
  completedAt: tsOrNull(r.completed_at),
})

export const inboxToRow = (i: InboxItem, userId: string): Row => ({
  id: i.id,
  user_id: userId,
  text: i.text,
  created_at: i.createdAt,
  updated_at: i.updatedAt ?? i.createdAt,
})
export const rowToInbox = (r: Row): InboxItem => ({
  id: str(r.id),
  text: str(r.text),
  createdAt: ts(r.created_at),
  updatedAt: ts(r.updated_at),
})

export const noteToRow = (n: Note, userId: string): Row => ({
  id: n.id,
  user_id: userId,
  title: n.title,
  body: n.body,
  project_id: n.projectId,
  created_at: n.createdAt ?? n.updatedAt,
  updated_at: n.updatedAt,
})
export const rowToNote = (r: Row): Note => ({
  id: str(r.id),
  title: str(r.title),
  body: str(r.body),
  projectId: strOrNull(r.project_id),
  createdAt: ts(r.created_at),
  updatedAt: ts(r.updated_at),
})

export const workEventToRow = (e: WorkEvent, userId: string): Row => ({
  id: e.id,
  user_id: userId,
  task_id: e.taskId,
  points: e.points,
  at: e.at,
  kind: e.kind ?? 'credit',
  reverses: e.reverses ?? null,
  reason: e.reason ?? null,
  task_title: e.taskTitle ?? null,
  impact: e.impact ?? null,
  breakdown: e.breakdown ?? null,
  project_id: e.projectId ?? null,
  goal_id: e.goalId ?? null,
  scoring_version: e.scoringVersion ?? null,
})
export const rowToWorkEvent = (r: Row): WorkEvent => ({
  id: str(r.id),
  taskId: str(r.task_id),
  points: Number(r.points),
  at: ts(r.at),
  kind: r.kind as WorkEvent['kind'],
  reverses: optional(r.reverses),
  reason: (r.reason ?? undefined) as WorkEvent['reason'],
  taskTitle: optional(r.task_title),
  impact: r.impact == null ? undefined : (Number(r.impact) as WorkEvent['impact']),
  breakdown: (r.breakdown ?? undefined) as WorkEvent['breakdown'],
  projectId: strOrNull(r.project_id),
  goalId: strOrNull(r.goal_id),
  scoringVersion: r.scoring_version == null ? undefined : Number(r.scoring_version),
})

export const userEventToRow = (e: UserEvent, userId: string): Row => ({
  id: e.id,
  user_id: userId,
  type: e.type,
  task_id: e.taskId,
  at: e.at,
  source: e.source ?? null,
  was_suggested: e.wasSuggested ?? null,
  data: e.data ?? null,
})
export const rowToUserEvent = (r: Row): UserEvent => ({
  id: str(r.id),
  type: r.type as UserEvent['type'],
  taskId: str(r.task_id),
  at: ts(r.at),
  source: (r.source ?? undefined) as UserEvent['source'],
  wasSuggested: r.was_suggested == null ? undefined : Boolean(r.was_suggested),
  data: (r.data ?? undefined) as UserEvent['data'],
})

export const settingsToRow = (s: Settings, userId: string, fallbackTime: string): Row => ({
  user_id: userId,
  name: s.name,
  show_meaningful_work: s.showMeaningfulWork,
  theme: s.theme,
  updated_at: s.updatedAt ?? fallbackTime,
})
export const rowToSettings = (r: Row): Settings => ({
  name: str(r.name),
  showMeaningfulWork: Boolean(r.show_meaningful_work),
  theme: r.theme as Settings['theme'],
  updatedAt: ts(r.updated_at),
})

/** Every table MYOS stores, as rows. Used for diffing and for uploads. */
export type TableRows = {
  goals: Row[]
  projects: Row[]
  milestones: Row[]
  tasks: Row[]
  inbox_items: Row[]
  notes: Row[]
  work_events: Row[]
  user_events: Row[]
  settings: Row[]
}

export function stateToRows(state: AppState, userId: string, fallbackTime = new Date(0).toISOString()): TableRows {
  return {
    goals: state.goals.map((g) => goalToRow(g, userId)),
    projects: state.projects.map((p) => projectToRow(p, userId)),
    milestones: state.milestones.map((m) => milestoneToRow(m, userId, fallbackTime)),
    tasks: state.tasks.map((t) => taskToRow(t, userId)),
    inbox_items: state.inbox.map((i) => inboxToRow(i, userId)),
    notes: state.notes.map((n) => noteToRow(n, userId)),
    work_events: state.workEvents.map((e) => workEventToRow(e, userId)),
    user_events: state.events.map((e) => userEventToRow(e, userId)),
    settings: [settingsToRow(state.settings, userId, fallbackTime)],
  }
}

export function rowsToState(rows: TableRows, version: number): AppState {
  const byAt = (a: { at: string }, b: { at: string }) => a.at.localeCompare(b.at)
  const byCreated = (a: { createdAt?: string }, b: { createdAt?: string }) =>
    (a.createdAt ?? '').localeCompare(b.createdAt ?? '')
  return {
    version,
    goals: rows.goals.map(rowToGoal).sort(byCreated),
    projects: rows.projects.map(rowToProject).sort(byCreated),
    milestones: rows.milestones.map(rowToMilestone).sort(byCreated),
    tasks: rows.tasks.map(rowToTask).sort(byCreated),
    inbox: rows.inbox_items.map(rowToInbox).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    notes: rows.notes.map(rowToNote),
    workEvents: rows.work_events.map(rowToWorkEvent).sort(byAt),
    events: rows.user_events.map(rowToUserEvent).sort(byAt),
    settings: rows.settings[0]
      ? rowToSettings(rows.settings[0])
      : { name: '', showMeaningfulWork: true, theme: 'system' },
  }
}
