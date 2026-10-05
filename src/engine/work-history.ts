import type { WorkEvent } from '@/types'

/**
 * Reading the append-only work log.
 * Nothing here changes history; it only decides which events count right now.
 */

const isCredit = (e: WorkEvent) => (e.kind ?? 'credit') === 'credit'

/** Credits that have not been cancelled by a reversal. */
export function countedCredits(events: WorkEvent[]): WorkEvent[] {
  const reversed = new Set(events.filter((e) => e.kind === 'reversal' && e.reverses).map((e) => e.reverses))
  return events.filter((e) => isCredit(e) && !reversed.has(e.id))
}

/** The task's most recent credit that still counts, if any. */
export function activeCreditFor(events: WorkEvent[], taskId: string): WorkEvent | undefined {
  return countedCredits(events)
    .filter((e) => e.taskId === taskId)
    .at(-1)
}

/** Net meaningful work across the whole log (credits minus reversals). */
export function netPoints(events: WorkEvent[]): number {
  return events.reduce((sum, e) => sum + e.points, 0)
}
