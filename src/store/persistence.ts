import { buildSampleState } from '@/data/sample'
import type { AppState } from '@/types'

const KEY = 'myos:v2'
const VERSION = 1

/** Loads saved state from this browser, or starts with sample data. */
export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as AppState
      if (parsed.version === VERSION && Array.isArray(parsed.tasks)) {
        // Fill in settings added after this data was first saved.
        return { ...parsed, settings: { ...parsed.settings, theme: parsed.settings.theme ?? 'system' } }
      }
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
