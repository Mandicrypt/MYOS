import {
  LOG_TABLES,
  MUTABLE_TABLES,
  type ChangeSet,
  type CloudRepository,
  type CloudSnapshot,
  type MutableTable,
} from './repository'
import type { Row } from './rows'

type Tables = Record<keyof CloudSnapshot, Map<string, Row>>

/** Sorts object keys the way Postgres jsonb does (by length, then alphabetically). */
function jsonbOrder(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(jsonbOrder)
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.length - b.length || a.localeCompare(b))
        .map(([k, v]) => [k, jsonbOrder(v)]),
    )
  return value
}

/** Mimics what Postgres sends back: "+00:00" timestamps and reordered JSON keys. */
function asPostgres(row: Row): Row {
  const out: Row = {}
  for (const [k, v] of Object.entries(row)) {
    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) out[k] = v.replace('Z', '+00:00')
    else out[k] = jsonbOrder(v)
  }
  return out
}

/**
 * An in-memory cloud for the sync checks. Behaves like the real database where it
 * matters: one store shared by many "devices", history that can't be edited or
 * deleted, and Postgres-shaped values coming back.
 */
export class MemoryRepository implements CloudRepository {
  private users = new Map<string, Tables>()
  /** Set to true to simulate being offline. */
  offline = false
  writes = 0

  private tables(userId: string): Tables {
    let t = this.users.get(userId)
    if (!t) {
      t = {
        goals: new Map(),
        projects: new Map(),
        milestones: new Map(),
        task_series: new Map(),
        tasks: new Map(),
        inbox_items: new Map(),
        notes: new Map(),
        work_events: new Map(),
        user_events: new Map(),
        settings: new Map(),
      }
      this.users.set(userId, t)
    }
    return t
  }

  async load(userId: string): Promise<CloudSnapshot> {
    if (this.offline) throw new Error('offline')
    const t = this.tables(userId)
    const read = (m: Map<string, Row>) => [...m.values()].map(asPostgres)
    return {
      goals: read(t.goals),
      projects: read(t.projects),
      milestones: read(t.milestones),
      task_series: read(t.task_series),
      tasks: read(t.tasks),
      inbox_items: read(t.inbox_items),
      notes: read(t.notes),
      work_events: read(t.work_events),
      user_events: read(t.user_events),
      settings: read(t.settings),
    }
  }

  async apply(userId: string, changes: ChangeSet): Promise<void> {
    if (this.offline) throw new Error('offline')
    this.writes++
    const t = this.tables(userId)
    if (changes.settings) t.settings.set(userId, { ...changes.settings })
    for (const table of MUTABLE_TABLES)
      for (const row of changes.upserts[table]) t[table].set(row.id as string, { ...row })
    for (const table of LOG_TABLES)
      for (const row of changes.appends[table])
        if (!t[table].has(row.id as string)) t[table].set(row.id as string, { ...row })
    for (const table of MUTABLE_TABLES) for (const id of changes.deletes[table]) t[table].delete(id)
    // Like the database trigger: occurrences of a deleted series are detached from it.
    for (const id of changes.deletes.task_series)
      for (const task of t.tasks.values())
        if (task.recurrence_id === id) {
          task.recurrence_id = null
          task.occurrence_date = null
        }
    // Like "on delete set null": rows pointing at a deleted task lose that link.
    for (const id of changes.deletes.tasks)
      for (const note of t.notes.values()) if (note.task_id === id) note.task_id = null
    this.checkLinks(t, changes)
  }

  /**
   * Refuses links to records that don't exist, like Postgres foreign keys do.
   * (Checked after the whole batch, like the real database checks a statement.)
   */
  private checkLinks(t: Tables, changes: ChangeSet) {
    const missing = (table: keyof Tables, id: unknown) => id != null && !t[table].has(id as string)
    const refs: [keyof Tables, string, keyof Tables][] = [
      ['projects', 'goal_id', 'goals'],
      ['milestones', 'project_id', 'projects'],
      ['task_series', 'project_id', 'projects'],
      ['task_series', 'goal_id', 'goals'],
      ['tasks', 'recurrence_id', 'task_series'],
      ['tasks', 'project_id', 'projects'],
      ['tasks', 'goal_id', 'goals'],
      ['tasks', 'milestone_id', 'milestones'],
      ['notes', 'project_id', 'projects'],
      ['notes', 'goal_id', 'goals'],
      ['notes', 'task_id', 'tasks'],
    ]
    // Like the database's unique rule: one occurrence per series per day.
    const seen = new Set<string>()
    for (const row of t.tasks.values()) {
      if (row.recurrence_id == null) continue
      const key = `${row.recurrence_id}|${row.occurrence_date}`
      if (seen.has(key))
        throw new Error('tasks: duplicate key value violates unique constraint "tasks_occurrence_unique"')
      seen.add(key)
    }
    for (const [table, column, target] of refs) {
      for (const row of changes.upserts[table as MutableTable] ?? []) {
        if (missing(target, row[column])) {
          // Undo nothing (tests only need the refusal), but fail like Postgres would.
          throw new Error(`${table}: violates foreign key constraint on ${column}`)
        }
      }
    }
  }

  /** For checks: how many rows a table holds for a user. */
  count(userId: string, table: keyof CloudSnapshot): number {
    return this.tables(userId)[table].size
  }
}
