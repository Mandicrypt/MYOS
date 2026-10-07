import { emptyChangeSet, LOG_TABLES, MUTABLE_TABLES, type ChangeSet } from '../cloud/repository'
import { stateToRows, type Row } from '../cloud/rows'
import type { AppState } from '@/types'
import { stableStringify } from './stable'

/**
 * What changed between `base` (what the cloud is known to hold) and `current`.
 * - Mutable records: new or edited rows are upserted; rows gone from current are deleted.
 * - History logs: only rows the cloud hasn't seen are added. Nothing is ever removed.
 */
export function diffStates(base: AppState, current: AppState, userId: string): ChangeSet {
  const from = stateToRows(base, userId)
  const to = stateToRows(current, userId)
  const changes = emptyChangeSet()

  for (const table of MUTABLE_TABLES) {
    const before = new Map(from[table].map((r) => [r.id as string, stableStringify(r)]))
    const after = new Set<string>()
    for (const row of to[table]) {
      const id = row.id as string
      after.add(id)
      if (before.get(id) !== stableStringify(row)) changes.upserts[table].push(row)
    }
    for (const id of before.keys()) if (!after.has(id)) changes.deletes[table].push(id)
  }

  for (const table of LOG_TABLES) {
    const known = new Set(from[table].map((r) => r.id as string))
    changes.appends[table] = to[table].filter((r: Row) => !known.has(r.id as string))
  }

  if (stableStringify(from.settings[0]) !== stableStringify(to.settings[0])) {
    changes.settings = to.settings[0]
    if (base.settings.name !== current.settings.name) changes.profileName = current.settings.name
  }
  return changes
}
