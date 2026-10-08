import { normalizeRule, weekdayOf, type RecurrenceRule } from '@/engine/recurrence'
import type { ISODate, RecurrenceFrequency } from '@/types'

export type RepeatMode = 'none' | 'daily' | 'weekly' | 'monthly' | 'custom'

/** What the Repeat controls edit. Turned into a real rule by `ruleFromDraft`. */
export type RepeatDraft = {
  mode: RepeatMode
  /** "Custom" only: every [interval] [unit]. */
  unit: RecurrenceFrequency
  interval: number
  daysOfWeek: number[]
  dayOfMonth: number
  startsOn: ISODate
  endsOn: ISODate | null
}

export function draftFromRule(rule: RecurrenceRule | null, today: ISODate): RepeatDraft {
  if (!rule)
    return {
      mode: 'none',
      unit: 'weekly',
      interval: 2,
      daysOfWeek: [weekdayOf(today)],
      dayOfMonth: Number(today.slice(8)),
      startsOn: today,
      endsOn: null,
    }
  return {
    mode: rule.interval === 1 ? rule.frequency : 'custom',
    unit: rule.frequency,
    interval: rule.interval,
    daysOfWeek: rule.daysOfWeek.length ? rule.daysOfWeek : [weekdayOf(rule.startsOn)],
    dayOfMonth: rule.dayOfMonth ?? Number(rule.startsOn.slice(8)),
    startsOn: rule.startsOn,
    endsOn: rule.endsOn,
  }
}

export function ruleFromDraft(d: RepeatDraft): RecurrenceRule | null {
  if (d.mode === 'none') return null
  const frequency: RecurrenceFrequency = d.mode === 'custom' ? d.unit : d.mode
  return normalizeRule({
    frequency,
    interval: d.mode === 'custom' ? Math.max(1, d.interval || 1) : 1,
    daysOfWeek: frequency === 'weekly' ? (d.daysOfWeek.length ? d.daysOfWeek : [weekdayOf(d.startsOn)]) : [],
    dayOfMonth: frequency === 'monthly' ? d.dayOfMonth : null,
    startsOn: d.startsOn,
    endsOn: d.endsOn && d.endsOn >= d.startsOn ? d.endsOn : null,
  })
}
