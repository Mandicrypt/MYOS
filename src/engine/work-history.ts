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

/**
 * After the user undoes an action, the task states may no longer match the
 * work log. Instead of removing history, add entries so they match again:
 * a reversal for a credit whose task is open, or a fresh credit for a task
 * that is done again.
 */
export function reconcileWorkLog(
  tasks: { id: string; status: 'open' | 'done' }[],
  log: WorkEvent[],
  makeId: () => string,
  at: string,
): WorkEvent[] {
  const additions: WorkEvent[] = []
  for (const task of tasks) {
    const active = activeCreditFor(log, task.id)
    if (task.status === 'open' && active) {
      additions.push({
        ...active,
        id: makeId(),
        kind: 'reversal',
        reverses: active.id,
        reason: 'undone',
        points: -active.points,
        at,
      })
    }
    if (task.status === 'done' && !active) {
      const last = log.filter((e) => e.taskId === task.id && (e.kind ?? 'credit') === 'credit').at(-1)
      if (last) additions.push({ ...last, id: makeId(), kind: 'credit', reverses: undefined, reason: 'undone', at })
    }
  }
  return additions
}
