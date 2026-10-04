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

export type TaskStatus = 'open' | 'done'

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
  createdAt: ISODateTime
  completedAt: ISODateTime | null
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
}

export type Milestone = {
  id: ID
  projectId: ID
  title: string
  dueOn: ISODate | null
  done: boolean
}

export type GoalStatus = 'active' | 'paused' | 'achieved'

export type Goal = {
  id: ID
  title: string
  why: string
  status: GoalStatus
  createdAt: ISODateTime
}

export type InboxItem = { id: ID; text: string; createdAt: ISODateTime }

export type Note = {
  id: ID
  title: string
  body: string
  projectId: ID | null
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
 * One event per completed task, scored by how much it mattered, not by count.
 */
export type WorkEvent = {
  id: ID
  taskId: ID
  points: number
  at: ISODateTime
  /** Missing on events recorded before scoring v2. */
  breakdown?: WorkBreakdown
  projectId?: ID | null
  goalId?: ID | null
  scoringVersion?: number
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

/**
 * One thing the user did, or one thing that happened to a task.
 * This is the raw material for personalisation later. No learning happens yet.
 */
export type UserEvent = {
  id: ID
  type: UserEventType
  taskId: ID
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
}

export type AppState = {
  version: number
  goals: Goal[]
  projects: Project[]
  milestones: Milestone[]
  tasks: Task[]
  inbox: InboxItem[]
  notes: Note[]
  workEvents: WorkEvent[]
  events: UserEvent[]
  settings: Settings
}
