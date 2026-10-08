import type {
  AppState,
  Goal,
  InboxItem,
  Milestone,
  Note,
  Project,
  Settings,
  Task,
  TaskSeries,
  UserEvent,
  WorkEvent,
} from '@/types'

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
  importance: g.importance,
  kind: g.kind,
  cadence: g.cadence,
  ends_on: g.endsOn,
  target_date: g.targetDate,
  completed_at: g.completedAt,
  archived_at: g.archivedAt,
  created_at: g.createdAt,
  updated_at: g.updatedAt ?? g.createdAt,
})
export const rowToGoal = (r: Row): Goal => ({
  id: str(r.id),
  title: str(r.title),
  why: str(r.why),
  status: (r.status === 'achieved' ? 'completed' : r.status) as Goal['status'],
  importance: (r.importance ?? 'normal') as Goal['importance'],
  kind: (r.kind ?? 'finite') as Goal['kind'],
  cadence: (r.cadence ?? null) as Goal['cadence'],
  endsOn: strOrNull(r.ends_on),
  targetDate: strOrNull(r.target_date),
  completedAt: tsOrNull(r.completed_at),
  archivedAt: tsOrNull(r.archived_at),
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
  // Deprecated column: links live on notes.task_id now.
  note_ids: [],
  outcome: t.outcome ?? null,
  suppressed: t.suppressed,
  postpone_count: t.postponeCount,
  origin: t.origin,
  parent_id: t.parentId,
  recurrence_id: t.recurrenceId,
  occurrence_date: t.occurrenceDate,
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
  noteIds: [],
  outcome: optional(r.outcome),
  suppressed: Boolean(r.suppressed),
  postponeCount: Number(r.postpone_count ?? 0),
  origin: r.origin as Task['origin'],
  parentId: strOrNull(r.parent_id),
  recurrenceId: strOrNull(r.recurrence_id),
  occurrenceDate: strOrNull(r.occurrence_date),
  createdAt: ts(r.created_at),
  updatedAt: ts(r.updated_at),
  completedAt: tsOrNull(r.completed_at),
})

export const seriesToRow = (s: TaskSeries, userId: string): Row => ({
  id: s.id,
  user_id: userId,
  title: s.title,
  description: s.description ?? null,
  project_id: s.projectId,
  goal_id: s.goalId,
  effort_minutes: s.effortMinutes,
  impact: s.signals.impact,
  consequence: s.signals.consequence,
  user_importance: s.signals.userImportance,
  checklist: s.checklist,
  links: s.links,
  frequency: s.frequency,
  interval_count: s.interval,
  days_of_week: s.daysOfWeek,
  day_of_month: s.dayOfMonth,
  starts_on: s.startsOn,
  ends_on: s.endsOn,
  timezone: s.timezone,
  active: s.active,
  created_at: s.createdAt,
  updated_at: s.updatedAt ?? s.createdAt,
})
export const rowToSeries = (r: Row): TaskSeries => ({
  id: str(r.id),
  title: str(r.title),
  description: optional(r.description),
  projectId: strOrNull(r.project_id),
  goalId: strOrNull(r.goal_id),
  effortMinutes: r.effort_minutes == null ? null : Number(r.effort_minutes),
  signals: {
    impact: Number(r.impact) as TaskSeries['signals']['impact'],
    consequence: Number(r.consequence) as TaskSeries['signals']['consequence'],
    userImportance: r.user_importance as TaskSeries['signals']['userImportance'],
  },
  checklist: (r.checklist as TaskSeries['checklist'] | null) ?? [],
  links: (r.links as TaskSeries['links'] | null) ?? [],
  frequency: r.frequency as TaskSeries['frequency'],
  interval: Number(r.interval_count ?? 1),
  daysOfWeek: ((r.days_of_week as number[] | null) ?? []).map(Number),
  dayOfMonth: r.day_of_month == null ? null : Number(r.day_of_month),
  startsOn: str(r.starts_on),
  endsOn: strOrNull(r.ends_on),
  timezone: str(r.timezone) || 'UTC',
  active: Boolean(r.active),
  createdAt: ts(r.created_at),
  updatedAt: ts(r.updated_at),
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
  goal_id: n.goalId,
  task_id: n.taskId,
  archived_at: n.archivedAt,
  created_at: n.createdAt ?? n.updatedAt,
  updated_at: n.updatedAt,
})
export const rowToNote = (r: Row): Note => ({
  id: str(r.id),
  title: str(r.title),
  body: str(r.body),
  projectId: strOrNull(r.project_id),
  goalId: strOrNull(r.goal_id),
  taskId: strOrNull(r.task_id),
  archivedAt: tsOrNull(r.archived_at),
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
  recurrence_id: e.recurrenceId ?? null,
  occurrence_date: e.occurrenceDate ?? null,
  local_day: e.localDay ?? null,
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
  receivedAt: r.created_at == null ? undefined : ts(r.created_at),
  recurrenceId: strOrNull(r.recurrence_id),
  occurrenceDate: strOrNull(r.occurrence_date),
  localDay: strOrNull(r.local_day),
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
  daily_minutes: s.dailyMinutes,
  theme: s.theme,
  updated_at: s.updatedAt ?? fallbackTime,
})
export const rowToSettings = (r: Row): Settings => ({
  name: str(r.name),
  showMeaningfulWork: Boolean(r.show_meaningful_work),
  dailyMinutes: r.daily_minutes == null ? 240 : Number(r.daily_minutes),
  theme: r.theme as Settings['theme'],
  updatedAt: ts(r.updated_at),
})

/** Every table MYOS stores, as rows. Used for diffing and for uploads. */
export type TableRows = {
  goals: Row[]
  projects: Row[]
  milestones: Row[]
  task_series: Row[]
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
    task_series: state.series.map((x) => seriesToRow(x, userId)),
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
    series: rows.task_series.map(rowToSeries).sort(byCreated),
    tasks: rows.tasks.map(rowToTask).sort(byCreated),
    inbox: rows.inbox_items.map(rowToInbox).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    notes: rows.notes.map(rowToNote),
    workEvents: rows.work_events.map(rowToWorkEvent).sort(byAt),
    events: rows.user_events.map(rowToUserEvent).sort(byAt),
    settings: rows.settings[0]
      ? rowToSettings(rows.settings[0])
      : { name: '', showMeaningfulWork: true, theme: 'system', dailyMinutes: 240 },
  }
}
