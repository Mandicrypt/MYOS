import { newId } from '@/lib/id'
import type { ActionSource, AppState, ID, UserEvent, UserEventType } from '@/types'

/** Enough history to learn from, small enough for browser storage. */
const MAX_EVENTS = 3000

export function record(
  state: AppState,
  type: UserEventType,
  taskId: ID,
  extra: { source?: ActionSource; wasSuggested?: boolean; data?: UserEvent['data'] } = {},
): AppState {
  const event: UserEvent = { id: newId(), type, taskId, at: new Date().toISOString(), ...extra }
  const events = [...state.events, event]
  return { ...state, events: events.length > MAX_EVENTS ? events.slice(-MAX_EVENTS) : events }
}

/** Summary of how the user responds to MYOS. A starting point for personalisation. */
export function correctionSummary(state: AppState) {
  const count = (type: UserEventType) => state.events.filter((e) => e.type === type).length
  const suggested = state.events.filter((e) => e.wasSuggested)
  return {
    completedSuggestions: suggested.filter((e) => e.type === 'task.completed').length,
    skippedSuggestions: suggested.filter((e) => e.type === 'task.skipped' || e.type === 'task.postponed').length,
    markedImportant: state.events.filter((e) => e.type === 'task.importance_changed' && e.data?.to === 'high').length,
    markedLessImportant: state.events.filter((e) => e.type === 'task.importance_changed' && e.data?.to === 'low')
      .length,
    postponed: count('task.postponed'),
    deadlinesChanged: count('task.deadline_changed'),
    suppressed: count('task.suppressed'),
  }
}
