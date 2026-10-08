/**
 * MYOS data model.
 *
 * Work hierarchy:  Goal → Project → Milestone → Task → Outcome
 * Relationships are optional so the user never has to maintain them by hand.
 *
 * IDs are strings (UUIDs once a database exists).
 * Calendar days use "YYYY-MM-DD". Moments in time use ISO 8601 UTC strings.
 */

export type ID = string
export type ISODate = string
export type ISODateTime = string

export type Level = 1 | 2 | 3 | 4 | 5
export type UserImportance = 'low' | 'normal' | 'high'

/**
 * Raw inputs for the importance engine. The UI never shows these numbers;
 * it shows the engine's conclusion ("High impact · Due today").
 */
export type ImportanceSignals = {
  impact: Level
  consequence: Level
  userImportance: UserImportance
}

export type ChecklistItem = { id: ID; text: string; done: boolean }
export type TaskLink = { label: string; url: string }

/** `skipped`: a recurring occurrence the user chose to skip. Kept as history, earns nothing. */
export type TaskStatus = 'open' | 'done' | 'skipped'

/** How a task came to exist. Lets future scoring spot split or bulk-created work. */
export type TaskOrigin = 'user' | 'inbox' | 'sample'

export type Task = {
  id: ID
  title: string
  description?: string
  status: TaskStatus
  projectId: ID | null
  /** Only for tasks that serve a goal directly, without a project. */
  goalId: ID | null
  milestoneId: ID | null
  /** The day the user intends to do it. null = "Later". */
  plannedFor: ISODate | null
  dueOn: ISODate | null
  /** Estimated effort in minutes. */
  effortMinutes: number | null
  signals: ImportanceSignals
  dependsOn: ID[]
  /** Something outside MYOS the task is waiting on. */
  waitingOn?: string
  checklist: ChecklistItem[]
  links: TaskLink[]
  /** @deprecated Since Phase 2 notes point to their task (Note.taskId). Always empty. */
  noteIds: ID[]
  /** What finishing this task produces. */
  outcome?: string
  /** The user asked MYOS not to suggest this. It stays in Tasks. */
  suppressed: boolean
  /** How many times it was pushed to a later day. */
  postponeCount: number
  origin: TaskOrigin
  /** If this task was split out of a bigger one. Reserved for anti-gaming later. */
  parentId: ID | null
  /**
   * Recurring tasks: the series this task is one occurrence of, and the day it is for.
   * Both are null for a normal task (and are always set or cleared together).
   */
  recurrenceId: ID | null
  occurrenceDate: ISODate | null
  createdAt: ISODateTime
  /** Set automatically whenever the task changes. Latest wins during sync. */
  updatedAt?: ISODateTime
  completedAt: ISODateTime | null
}

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly'

/**
 * A recurring task: the rule and the template its occurrences are made from.
 * Occurrences are ordinary Tasks (see Task.recurrenceId), created lazily.
 */
export type TaskSeries = {
  id: ID
  title: string
  description?: string
  projectId: ID | null
  goalId: ID | null
  effortMinutes: number | null
  signals: ImportanceSignals
  checklist: ChecklistItem[]
  links: TaskLink[]
  frequency: RecurrenceFrequency
  /** Every N days / weeks / months. */
  interval: number
  /** Weekly only. 0 = Monday … 6 = Sunday. Empty means the weekday of `startsOn`. */
  daysOfWeek: number[]
  /** Monthly only. Months without this day use their last day. Null means the day of `startsOn`. */
  dayOfMonth: number | null
  startsOn: ISODate
  endsOn: ISODate | null
  /** IANA timezone the dates belong to, e.g. "Africa/Lagos". */
  timezone: string
  /** Stopped series keep their history but make no new occurrences. */
  active: boolean
  createdAt: ISODateTime
  updatedAt?: ISODateTime
}

export type ProjectStatus = 'active' | 'paused' | 'done'

export type Project = {
  id: ID
  title: string
  summary: string
  goalId: ID | null
  status: ProjectStatus
  deadline: ISODate | null
  createdAt: ISODateTime
  updatedAt?: ISODateTime
}

export type Milestone = {
  id: ID
  projectId: ID
  title: string
  dueOn: ISODate | null
  done: boolean
  createdAt?: ISODateTime
  updatedAt?: ISODateTime
}

export type GoalStatus = 'active' | 'paused' | 'completed' | 'archived'
export type GoalImportance = 'low' | 'normal' | 'high'
/** A finite goal finishes (target date, progress). An ongoing goal is kept up (routines, consistency). */
export type GoalKind = 'finite' | 'ongoing'
export type GoalCadence = 'daily' | 'weekly' | 'monthly' | 'custom'

export type Goal = {
  id: ID
  title: string
  /** The description: why this goal matters. */
  why: string
  status: GoalStatus
  importance: GoalImportance
  /** Defaults to finite. Existing goals are finite. */
  kind: GoalKind
  /** Finite goals only. Always null for ongoing goals. */
  targetDate: ISODate | null
  /** Ongoing goals only: how often the routine is meant to happen. */
  cadence: GoalCadence | null
  /** Ongoing goals only: an optional end. Null means it never ends. */
  endsOn: ISODate | null
  completedAt: ISODateTime | null
  archivedAt: ISODateTime | null
  createdAt: ISODateTime
  updatedAt?: ISODateTime
}

export type InboxItem = { id: ID; text: string; createdAt: ISODateTime; updatedAt?: ISODateTime }

/** A note can give context to a project, a goal and a task, each optional. */
export type Note = {
  id: ID
  title: string
  body: string
  projectId: ID | null
  goalId: ID | null
  taskId: ID | null
  archivedAt: ISODateTime | null
  createdAt?: ISODateTime
  updatedAt: ISODateTime
}

/** How a work value was reached. Stored so scoring can be audited and re-run later. */
export type WorkBreakdown = {
  base: number
  alignment: number
  importance: number
  effort: number
  unblocking: number
  repetition: number
}

/**
 * Foundation for the future Meaningful Work Score.
 *
 * Append-only. A completion adds a "credit". If the task is reopened, a
 * "reversal" is added that cancels that credit; the credit itself is never
 * edited or removed. Deleting a task leaves its history in place. Totals are
 * worked out from the log (see engine/work-history.ts).
 */
export type WorkEvent = {
  id: ID
  /** May point to a task that no longer exists. */
  taskId: ID
  /** Negative for a reversal. */
  points: number
  at: ISODateTime
  /** Missing on events saved before history became append-only; treat as "credit". */
  kind?: 'credit' | 'reversal'
  /** For a reversal: the credit it cancels. */
  reverses?: ID
  /** Why a reversal or re-credit was added. */
  reason?: 'reopened' | 'undone'
  /** Snapshots taken when the event was recorded, so history reads correctly after edits or deletion. */
  taskTitle?: string
  impact?: Level
  /** Missing on events recorded before scoring v2. */
  breakdown?: WorkBreakdown
  projectId?: ID | null
  goalId?: ID | null
  scoringVersion?: number
  /**
   * For completed recurring occurrences: which occurrence this was (so deleting and
   * recreating it can never earn twice), and the date in the series' timezone when it was done.
   */
  recurrenceId?: ID | null
  occurrenceDate?: ISODate | null
  localDay?: ISODate | null
  /** When the server stored it (set by the database, never by a device). Only on synced events. */
  receivedAt?: ISODateTime
}

/** Where in the app a user action happened. */
export type ActionSource = 'home' | 'focus' | 'list' | 'menu' | 'editor' | 'review' | 'inbox' | 'quick-add'

export type UserEventType =
  | 'task.created'
  | 'task.completed'
  | 'task.reopened'
  | 'task.planned'
  | 'task.postponed'
  | 'task.skipped'
  | 'task.importance_changed'
  | 'task.deadline_changed'
  | 'task.waiting_set'
  | 'task.waiting_cleared'
  | 'task.suppressed'
  | 'task.unsuppressed'
  | 'task.dependency_added'
  | 'task.dependency_removed'
  | 'task.unblocked'
  | 'task.deleted'
  /** Recurring tasks. `taskId` is the occurrence, or the series for series-level events. */
  | 'occurrence.skipped'
  | 'series.created'
  | 'series.updated'
  | 'series.stopped'
  | 'series.deleted'
  /** Weekly Review: the user accepted or turned down a recommended priority. */
  | 'recommendation.accepted'
  | 'recommendation.rejected'
  /** Daily Plan: the user accepted or turned down a suggestion for today. */
  | 'plan.accepted'
  | 'plan.rejected'
  /** A timed Focus session ended (data.minutes). */
  | 'focus.session'
  /** The user finished their Weekly Review (data.week = Monday). No task. */
  | 'review.completed'

/**
 * One thing the user did, or one thing that happened to a task.
 * This is the raw material for personalisation later. No learning happens yet.
 */
export type UserEvent = {
  id: ID
  type: UserEventType
  /** null for events that aren't about one task. */
  taskId: ID | null
  at: ISODateTime
  source?: ActionSource
  /** True if MYOS was suggesting this task as the main focus at the time. */
  wasSuggested?: boolean
  /** Small, type-specific details (old/new values, days late, and so on). */
  data?: Record<string, string | number | boolean | null>
}

export type ThemeChoice = 'light' | 'dark' | 'system'

export type Settings = {
  name: string
  showMeaningfulWork: boolean
  theme: ThemeChoice
  /** Focused minutes available on a typical day; the Daily Plan fits work into this. */
  dailyMinutes: number
  updatedAt?: ISODateTime
}

export type AppState = {
  version: number
  goals: Goal[]
  series: TaskSeries[]
  projects: Project[]
  milestones: Milestone[]
  tasks: Task[]
  inbox: InboxItem[]
  notes: Note[]
  workEvents: WorkEvent[]
  events: UserEvent[]
  settings: Settings
}
