import type { AppState, ISODate, Task } from '@/types'

export type EngineContext = {
  state: AppState
  today: ISODate
}

export type RankedTask = {
  task: Task
  score: number
  /** Short human reasons, most important first. e.g. ["High impact", "Due today"] */
  reasons: string[]
  blocked: boolean
}

/**
 * Anything that can decide what matters. Phase 0 uses a rule-based engine;
 * an AI or server-side engine can replace it without touching the UI.
 */
export interface PriorityEngine {
  rank(tasks: Task[], ctx: EngineContext): RankedTask[]
}
