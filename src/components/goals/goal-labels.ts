import { daysToTarget } from '@/engine/goals'
import { friendlyDay, parseISODate } from '@/lib/dates'
import type { Goal, ISODate } from '@/types'

export const STATUS_LABEL: Record<Goal['status'], string> = {
  active: 'Active',
  paused: 'Paused',
  completed: 'Completed',
  archived: 'Archived',
}

/** "Target 31 Dec" / "Target Friday" / "Target passed 3 Oct". */
export function targetLabel(goal: Goal, today: ISODate): string | null {
  if (!goal.targetDate) return null
  const days = daysToTarget(goal, today) ?? 0
  const date = parseISODate(goal.targetDate).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: days > 300 ? 'numeric' : undefined,
  })
  if (goal.status === 'active' && days < 0) return `Target passed ${date}`
  if (days >= 0 && days < 7) return `Target ${friendlyDay(goal.targetDate, today)}`
  return `Target ${date}`
}
