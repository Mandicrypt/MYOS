import { LOG_TABLES, MUTABLE_TABLES, type ChangeSet, type CloudRepository, type CloudSnapshot } from './repository'
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
  }

  /** For checks: how many rows a table holds for a user. */
  count(userId: string, table: keyof CloudSnapshot): number {
    return this.tables(userId)[table].size
  }
}
