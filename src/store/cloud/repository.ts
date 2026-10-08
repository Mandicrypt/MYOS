import type { Row, TableRows } from './rows'

/** Tables whose rows can be created, edited and deleted. Order matters for foreign keys. */
export const MUTABLE_TABLES = [
  'goals',
  'projects',
  'milestones',
  'task_series',
  'tasks',
  'inbox_items',
  'notes',
] as const
export type MutableTable = (typeof MUTABLE_TABLES)[number]

/** Append-only tables. Rows are only ever added. */
export const LOG_TABLES = ['work_events', 'user_events'] as const
export type LogTable = (typeof LOG_TABLES)[number]

/** What needs to reach the cloud to make it match this device. */
export type ChangeSet = {
  upserts: Record<MutableTable, Row[]>
  deletes: Record<MutableTable, string[]>
  appends: Record<LogTable, Row[]>
  settings: Row | null
  /** Kept in step with settings.name. */
  profileName: string | null
}

/** Everything one user has in the cloud, as rows. `settings` is empty for a brand-new account. */
export type CloudSnapshot = TableRows

/**
 * The storage contract the sync layer needs. Supabase implements it in the app;
 * an in-memory version implements it for the checks.
 */
export interface CloudRepository {
  load(userId: string): Promise<CloudSnapshot>
  apply(userId: string, changes: ChangeSet): Promise<void>
}

export function emptyChangeSet(): ChangeSet {
  return {
    upserts: { goals: [], projects: [], milestones: [], task_series: [], tasks: [], inbox_items: [], notes: [] },
    deletes: { goals: [], projects: [], milestones: [], task_series: [], tasks: [], inbox_items: [], notes: [] },
    appends: { work_events: [], user_events: [] },
    settings: null,
    profileName: null,
  }
}

export function isEmptyChangeSet(c: ChangeSet): boolean {
  return (
    !c.settings &&
    c.profileName === null &&
    MUTABLE_TABLES.every((t) => !c.upserts[t].length && !c.deletes[t].length) &&
    LOG_TABLES.every((t) => !c.appends[t].length)
  )
}
