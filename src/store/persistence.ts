import { buildSampleState } from '@/data/sample'
import type { AppState, Task } from '@/types'

const KEY = 'myos:v2'
export const STATE_VERSION = 2

type Saved = Omit<AppState, 'events'> & { events?: AppState['events'] }

/** Brings data saved by an older version up to date, keeping everything the user made. */
function migrate(saved: Saved): AppState | null {
  if (!Array.isArray(saved.tasks)) return null
  if (saved.version > STATE_VERSION) return null
  return {
    ...saved,
    version: STATE_VERSION,
    tasks: saved.tasks.map((t) => {
      const old = t as Partial<Task> & Task
      return {
        ...old,
        suppressed: old.suppressed ?? false,
        postponeCount: old.postponeCount ?? 0,
        origin: old.origin ?? 'user',
        parentId: old.parentId ?? null,
      }
    }),
    events: saved.events ?? [],
    settings: { ...saved.settings, theme: saved.settings.theme ?? 'system' },
  }
}

/** Loads saved state from this browser, or starts with sample data. */
export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const migrated = migrate(JSON.parse(raw) as Saved)
      if (migrated) return migrated
    }
  } catch {
    // Storage blocked or data unreadable: fall back to sample data.
  }
  return buildSampleState()
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // Storage full or blocked. The app keeps working for this visit.
  }
}
