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

/**
 * Foundation for the future Meaningful Work Score.
 * One event per completed task, scored by how much it mattered, not by count.
 */
export type WorkEvent = {
  id: ID
  taskId: ID
  points: number
  at: ISODateTime
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
  settings: Settings
}
