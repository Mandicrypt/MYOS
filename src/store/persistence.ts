import { buildSampleState } from '@/data/sample'
import type { AppState, Task } from '@/types'

/**
 * Local storage on this device.
 *
 * - LEGACY_KEY holds data from before accounts existed (and local-only mode).
 * - Each signed-in user gets their own cache, so two accounts on one device never mix.
 */
export const LEGACY_KEY = 'myos:v2'
export const STATE_VERSION = 2

export const userCacheKey = (userId: string) => `myos:v2:user:${userId}`

type Saved = Omit<AppState, 'events'> & { events?: AppState['events'] }

/** Brings data saved by an older version up to date, keeping everything the user made. */
export function migrateSaved(saved: Saved): AppState | null {
  if (!saved || !Array.isArray(saved.tasks)) return null
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

export function readCache(key: string): AppState | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? migrateSaved(JSON.parse(raw) as Saved) : null
  } catch {
    return null
  }
}

export function writeCache(key: string, state: AppState): void {
  try {
    localStorage.setItem(key, JSON.stringify(state))
  } catch {
    // Storage full or blocked. The app keeps working for this visit.
  }
}

export function removeCache(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    // Nothing to do.
  }
}

/** Local-only mode: saved state from this browser, or sample data. */
export function loadState(): AppState {
  return readCache(LEGACY_KEY) ?? buildSampleState()
}

export function saveState(state: AppState): void {
  writeCache(LEGACY_KEY, state)
}

/** A brand-new account's starting point: nothing but default settings. */
export function emptyState(name = ''): AppState {
  return {
    version: STATE_VERSION,
    goals: [],
    projects: [],
    milestones: [],
    tasks: [],
    inbox: [],
    notes: [],
    workEvents: [],
    events: [],
    settings: { name, showMeaningfulWork: true, theme: 'system' },
  }
}

/** True if this device holds MYOS data worth offering to import. */
export function hasMeaningfulData(state: AppState | null): state is AppState {
  if (!state) return false
  return state.tasks.length + state.projects.length + state.goals.length + state.notes.length + state.inbox.length > 0
}
