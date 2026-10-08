import type { AppState } from '@/types'

type Stampable = { id: string; createdAt?: string; updatedAt?: string }

function stampList<T extends Stampable>(prev: T[], next: T[], now: string): T[] {
  if (prev === next) return next
  const before = new Map(prev.map((x) => [x.id, x]))
  let changed = false
  const out = next.map((item) => {
    const old = before.get(item.id)
    if (old === item) return item
    changed = true
    // New or edited: record when. Existing createdAt is kept.
    return { ...item, createdAt: item.createdAt ?? now, updatedAt: now }
  })
  return changed ? out : next
}

/**
 * Sets updatedAt on every record an action changed (compared by reference),
 * so cloud sync can pick the newest version. The domain reducer stays
 * unaware of timestamps; this runs after it.
 */
export function stampChanges(prev: AppState, next: AppState, now: string = new Date().toISOString()): AppState {
  if (prev === next) return next
  return {
    ...next,
    goals: stampList(prev.goals, next.goals, now),
    projects: stampList(prev.projects, next.projects, now),
    milestones: stampList(prev.milestones, next.milestones, now),
    series: stampList(prev.series, next.series, now),
    tasks: stampList(prev.tasks, next.tasks, now),
    inbox: stampList(prev.inbox, next.inbox, now),
    notes: stampList(prev.notes, next.notes, now),
    settings: prev.settings === next.settings ? next.settings : { ...next.settings, updatedAt: now },
  }
}
