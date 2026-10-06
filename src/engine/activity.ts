import { addDays } from '@/lib/dates'
import type { AppState, ID, ISODate } from '@/types'
import { ACTIVITY_RULES, type ActivityRules } from './activity-config'
import { isPlanComplete } from './daily-plan'
import { countedCredits } from './work-history'

/**
 * Activity score: points for meaningful activity, derived only from the
 * append-only history (work events + user events). Nothing here trusts a
 * stored "points" number, and every award has a fixed id, so the same thing
 * can never be counted twice however often it is replayed.
 *
 *   activity event → base points → validation / caps → activity score
 */

export type AwardKind = 'task' | 'milestone' | 'focus' | 'plan' | 'streak' | 'review'

export type Award = {
  /** Deterministic: one award per thing, ever. */
  id: string
  kind: AwardKind
  at: string
  day: ISODate
  base: number
  points: number
  label: string
  /** Why points were reduced or withheld, if they were. */
  note?: string
}

/**
 * Activity days are UTC days, the same boundaries as reward periods, so a score
 * comes out identical on any device and on the server, whatever the time zone.
 */
const utcDay = (iso: string): ISODate => new Date(iso).toISOString().slice(0, 10)
const hoursBetween = (a: string, b: string) => (new Date(b).getTime() - new Date(a).getTime()) / 3_600_000
const normalTitle = (title: string) => title.toLowerCase().replace(/\s+/g, ' ').trim()
const minutesBetween = (a: string, b: string) => (new Date(b).getTime() - new Date(a).getTime()) / 60_000

/** Every award ever earned, in time order, with caps applied. */
export function allAwards(state: AppState, rules: ActivityRules = ACTIVITY_RULES): Award[] {
  const { points: P, limits: L } = rules
  const raw: Award[] = []
  const credits = countedCredits(state.workEvents)
  const allCredits = state.workEvents.filter((e) => (e.kind ?? 'credit') === 'credit')

  // --- Completed tasks: once per task, ever. The award keeps the time of the
  // first completion, so completing → reopening → completing never earns twice
  // or moves points into a new day.
  const createdAt = new Map<ID, string>()
  for (const t of state.tasks) createdAt.set(t.id, t.createdAt)
  for (const e of state.events)
    if (e.type === 'task.created' && e.taskId && !createdAt.has(e.taskId)) createdAt.set(e.taskId, e.at)
  const counted = new Set(credits.map((c) => c.taskId))
  const firstCredit = new Map<ID, (typeof allCredits)[number]>()
  for (const c of allCredits)
    if (!firstCredit.has(c.taskId) || c.at < firstCredit.get(c.taskId)!.at) firstCredit.set(c.taskId, c)
  for (const [taskId, c] of firstCredit) {
    if (!counted.has(taskId)) continue // reopened and not finished again: nothing
    const impact = c.impact ?? state.tasks.find((t) => t.id === taskId)?.signals.impact ?? 3
    const important = impact >= 4 || (c.breakdown?.importance ?? 1) > 1
    const trivial = impact <= 2 && !important
    const base = important ? P.highPriorityTask : trivial ? P.trivialTask : P.task
    const created = createdAt.get(taskId)
    const tooQuick = created !== undefined && minutesBetween(created, c.at) < L.minTaskAgeMinutes
    // When the server saw it (only known for synced events): claimed times far earlier don't count.
    const backdated = c.receivedAt !== undefined && hoursBetween(c.at, c.receivedAt) > L.maxBackdateHours
    raw.push({
      id: `task:${taskId}`,
      kind: 'task',
      at: c.at,
      day: utcDay(c.at),
      base,
      points: tooQuick || backdated ? 0 : base,
      label: c.taskTitle ?? state.tasks.find((t) => t.id === taskId)?.title ?? 'Task',
      note: backdated
        ? `Recorded more than ${L.maxBackdateHours} hours after it says it happened`
        : tooQuick
          ? `Completed within ${L.minTaskAgeMinutes} minutes of creating it`
          : trivial
            ? 'small task'
            : undefined,
    })
  }

  // --- The same task title completed again on the same day earns once
  // (stops "delete it, recreate it, tick it again" farming).
  const titleSeen = new Set<string>()
  for (const a of raw.filter((x) => x.kind === 'task').sort((x, y) => x.at.localeCompare(y.at))) {
    const key = `${a.day}|${normalTitle(a.label)}`
    if (titleSeen.has(key) && a.points > 0) {
      a.points = 0
      a.note = 'Same task as one already completed today'
    }
    titleSeen.add(key)
  }

  // --- Milestones: all of a milestone's tasks done (at least the minimum).
  for (const m of state.milestones) {
    const tasks = state.tasks.filter((t) => t.milestoneId === m.id)
    if (tasks.length < L.minMilestoneTasks || !tasks.every((t) => counted.has(t.id))) continue
    const at = tasks
      .map((t) => credits.find((c) => c.taskId === t.id)!.at)
      .sort()
      .at(-1)!
    raw.push({
      id: `milestone:${m.id}`,
      kind: 'milestone',
      at,
      day: utcDay(at),
      base: P.milestone,
      points: P.milestone,
      label: m.title,
    })
  }

  // --- Focus sessions: long enough, one per task per day.
  const focusSeen = new Set<string>()
  for (const e of state.events) {
    if (e.type !== 'focus.session' || !e.taskId) continue
    const minutes = Number(e.data?.minutes ?? 0)
    const key = `${e.taskId}:${utcDay(e.at)}`
    if (minutes < L.minFocusMinutes || focusSeen.has(key)) continue
    focusSeen.add(key)
    raw.push({
      id: `focus:${e.id}`,
      kind: 'focus',
      at: e.at,
      day: utcDay(e.at),
      base: P.focusSession,
      points: P.focusSession,
      label: `Focus session · ${Math.round(minutes)} min`,
    })
  }

  // --- Weekly review: once per week.
  const reviewed = new Set<string>()
  for (const e of state.events) {
    if (e.type !== 'review.completed') continue
    const week = String(e.data?.week ?? utcDay(e.at))
    if (reviewed.has(week)) continue
    reviewed.add(week)
    raw.push({
      id: `review:${week}`,
      kind: 'review',
      at: e.at,
      day: utcDay(e.at),
      base: P.weeklyReview,
      points: P.weeklyReview,
      label: 'Weekly review completed',
    })
  }

  // --- Daily plan completed: once per day.
  const planDays = new Set(state.events.filter((e) => e.type === 'plan.accepted').map((e) => utcDay(e.at)))
  for (const day of planDays) {
    if (!isPlanComplete(state, day, utcDay)) continue
    const at =
      credits
        .filter((c) => utcDay(c.at) === day)
        .map((c) => c.at)
        .sort()
        .at(-1) ?? `${day}T12:00:00.000Z`
    raw.push({
      id: `plan:${day}`,
      kind: 'plan',
      at,
      day,
      base: P.dailyPlanComplete,
      points: P.dailyPlanComplete,
      label: 'Daily plan completed',
    })
  }

  // --- Caps, applied day by day in time order.
  raw.sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id))
  const perDay = new Map<ISODate, { tasks: number; trivial: number; focus: number; total: number }>()
  const capped = raw.map((a) => {
    const d = perDay.get(a.day) ?? { tasks: 0, trivial: 0, focus: 0, total: 0 }
    perDay.set(a.day, d)
    let points = a.points
    let note = a.note
    if (a.kind === 'task' && points > 0) {
      if (a.note === 'small task') {
        d.trivial++
        if (d.trivial > L.trivialTasksPerDay) {
          points = 0
          note = `More than ${L.trivialTasksPerDay} small tasks today`
        }
      }
      const room = Math.max(0, L.taskPointsPerDay - d.tasks)
      if (points > room) {
        points = room
        note = 'Daily task limit reached'
      }
      d.tasks += points
    }
    if (a.kind === 'focus') {
      d.focus++
      if (d.focus > L.focusSessionsPerDay) {
        points = 0
        note = `More than ${L.focusSessionsPerDay} focus sessions today`
      }
    }
    const room = Math.max(0, L.pointsPerDay - d.total)
    if (points > room) {
      points = room
      note = 'Daily limit reached'
    }
    d.total += points
    return { ...a, points, note: note === 'small task' ? undefined : note }
  })

  // --- Streak: a day with real work, following a day with real work.
  const workedDays = new Set(capped.filter((a) => a.kind === 'task' && a.points > 0).map((a) => a.day))
  const streaks: Award[] = []
  for (const day of workedDays) {
    if (!workedDays.has(addDays(day, -1))) continue
    const d = perDay.get(day)!
    const points = Math.min(P.dailyStreak, Math.max(0, L.pointsPerDay - d.total))
    d.total += points
    streaks.push({
      id: `streak:${day}`,
      kind: 'streak',
      at: `${day}T23:59:59.000Z`,
      day,
      base: P.dailyStreak,
      points,
      label: 'Daily streak',
    })
  }

  return [...capped, ...streaks].sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id))
}

export type ActivitySummary = { total: number; awards: Award[] }

/** Activity earned in [fromIso, toIso). */
export function activityBetween(
  state: AppState,
  fromIso: string,
  toIso: string,
  rules: ActivityRules = ACTIVITY_RULES,
): ActivitySummary {
  const awards = allAwards(state, rules).filter((a) => a.at >= fromIso && a.at < toIso)
  return { total: awards.reduce((sum, a) => sum + a.points, 0), awards }
}
