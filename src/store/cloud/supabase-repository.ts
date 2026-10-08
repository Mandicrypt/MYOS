import type { SupabaseClient } from '@supabase/supabase-js'
import { LOG_TABLES, MUTABLE_TABLES, type ChangeSet, type CloudRepository, type CloudSnapshot } from './repository'
import type { Row } from './rows'

const PAGE = 1000
const CHUNK = 500

const chunks = <T>(items: T[], size = CHUNK): T[][] => {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

/** Thrown for any cloud problem, so the sync layer can report it calmly. */
export class CloudError extends Error {}

/**
 * Supabase storage. The only file that knows table and column names exist in Supabase.
 * Row Level Security in the database limits every query to the signed-in user.
 */
export class SupabaseRepository implements CloudRepository {
  private readonly client: SupabaseClient
  constructor(client: SupabaseClient) {
    this.client = client
  }

  /** Reads every row of a table for this user, a page at a time (Supabase caps each request). */
  private async readAll(table: string, userId: string, orderBy: string): Promise<Row[]> {
    const rows: Row[] = []
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await this.client
        .from(table)
        .select('*')
        .eq('user_id', userId)
        .order(orderBy, { ascending: true })
        .range(from, from + PAGE - 1)
      if (error) throw new CloudError(`${table}: ${error.message}`)
      rows.push(...(data as Row[]))
      if (!data || data.length < PAGE) return rows
    }
  }

  async load(userId: string): Promise<CloudSnapshot> {
    const [goals, projects, milestones, task_series, tasks, inbox_items, notes, work_events, user_events, settings] =
      await Promise.all([
        this.readAll('goals', userId, 'created_at'),
        this.readAll('projects', userId, 'created_at'),
        this.readAll('milestones', userId, 'created_at'),
        this.readAll('task_series', userId, 'created_at'),
        this.readAll('tasks', userId, 'created_at'),
        this.readAll('inbox_items', userId, 'created_at'),
        this.readAll('notes', userId, 'created_at'),
        this.readAll('work_events', userId, 'at'),
        this.readAll('user_events', userId, 'at'),
        this.readAll('settings', userId, 'updated_at'),
      ])
    return { goals, projects, milestones, task_series, tasks, inbox_items, notes, work_events, user_events, settings }
  }

  async apply(userId: string, changes: ChangeSet): Promise<void> {
    const check = (table: string, error: { message: string } | null) => {
      if (error) throw new CloudError(`${table}: ${error.message}`)
    }

    if (changes.settings) {
      const { error } = await this.client.from('settings').upsert(changes.settings, { onConflict: 'user_id' })
      check('settings', error)
    }
    if (changes.profileName !== null) {
      const { error } = await this.client.from('profiles').update({ name: changes.profileName }).eq('id', userId)
      check('profiles', error)
    }

    // Parents before children, so foreign keys are satisfied.
    for (const table of MUTABLE_TABLES) {
      for (const rows of chunks(changes.upserts[table])) {
        const { error } = await this.client.from(table).upsert(rows, { onConflict: 'id' })
        check(table, error)
      }
    }

    // History is append-only: insert, and quietly skip anything already there.
    for (const table of LOG_TABLES) {
      for (const rows of chunks(changes.appends[table])) {
        const { error } = await this.client.from(table).upsert(rows, { onConflict: 'id', ignoreDuplicates: true })
        check(table, error)
      }
    }

    // Children before parents when deleting.
    for (const table of [...MUTABLE_TABLES].reverse()) {
      for (const ids of chunks(changes.deletes[table])) {
        const { error } = await this.client.from(table).delete().in('id', ids)
        check(table, error)
      }
    }
  }
}
