import type { AppState, ISODate, Task } from '@/types'

export type EngineContext = {
  state: AppState
  today: ISODate
}

/**
 * One reason a task matters. The engine scores with these and the UI shows
 * the same reasons, so the explanation always matches the decision.
 */
export type Reason = {
  /** Stable id, useful for analytics and for picking phrasing. */
  key: string
  /** How much this reason added to the score. */
  weight: number
  /** Short label for lists: "Due today", "Blocking 2 tasks". */
  short: string | null
  /** Full sentence for Focus: "Two other tasks are waiting on it." */
  long: string | null
}

export type RankedTask = {
  task: Task
  score: number
  /** Up to two short labels, most important first. */
  reasons: string[]
  /** Every reason, strongest first. */
  why: Reason[]
  /** Waiting on another task or on something outside MYOS. */
  blocked: boolean
  /** The user asked MYOS not to suggest it. */
  suppressed: boolean
}

/**
 * Anything that can decide what matters. Phase 0 uses a rule-based engine;
 * an AI or server-side engine can replace it without touching the UI.
 */
export interface PriorityEngine {
  rank(tasks: Task[], ctx: EngineContext): RankedTask[]
}
