import { goalDays, routinesForWeek, type RoutineWeek } from '@/engine/routines'
import { goalProgressChange, tasksForGoal } from '@/engine/goals'
import { goalIdOf } from '@/engine/relations'
import { isForToday, suggestable } from '@/engine/next'
import type { RankedTask } from '@/engine/types'
import { countedCredits } from '@/engine/work-history'
import { addDays, daysBetween, parseISODate, toISODate } from '@/lib/dates'
import type { AppState, Goal, ID, ISODate, Task } from '@/types'
import { selectReview } from './selectors'

/**
 * Weekly Review, worked out from what MYOS already records: completions in the
 * work log, task history, and the decision engine. Nothing here is a second
 * priority system; recommendations come straight from `suggestable()`.
 */

/** Monday of the week containing `day`. */
export function weekStartOf(day: ISODate): ISODate {
  const d = parseISODate(day)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return toISODate(d)
}

const startOfDayIso = (day: ISODate) => parseISODate(day).toISOString()

export type CompletedGroup = {
  projectId: ID | null
  label: string
  items: { taskId: ID; title: string; exists: boolean }[]
}
export type AttentionItem = { key: string; title: string; reason: string; to: string; taskId?: ID }
export type GoalWeek = {
  goal: Goal
  change: number
  projectsWorked: number
  tasksCompleted: number
  /** Set when the goal was completed during this week. */
  completedThisWeek: boolean
  /** Ongoing goals: days this week on which every routine was done, out of days that had any. */
  consistency: { complete: number; of: number } | null
}
export type Recommendation = { ranked: RankedTask; decision: 'accepted' | 'rejected' | null }

export type WeekReview = {
  /** How each recurring task did this week. */
  routines: RoutineWeek[]
  start: ISODate
  end: ISODate
  isCurrent: boolean
  summary: { completed: number; created: number; overdue: number | null; projectsWorked: number; goalsMoved: number }
  completed: CompletedGroup[]
  attention: AttentionItem[]
  goals: GoalWeek[]
  /** Only for the current week. */
  recommendations: Recommendation[]
  /** The day accepted recommendations are planned for: next Monday. */
  nextWeekStart: ISODate
}

const RECOMMENDATIONS = 3

function weekConsistency(state: AppState, goalId: ID, start: ISODate, end: ISODate, today: ISODate) {
  const days = goalDays(state, goalId, start, end < today ? end : today, today).filter((d) => d.expected > 0)
  return { complete: days.filter((d) => d.state === 'done').length, of: days.length }
}
const STALE_DAYS = 14

export function selectWeekReview(state: AppState, start: ISODate, today: ISODate): WeekReview {
  const end = addDays(start, 6)
  const from = startOfDayIso(start)
  const to = startOfDayIso(addDays(start, 7))
  const isCurrent = weekStartOf(today) === start
  const nextWeekStart = addDays(weekStartOf(today), 7)

  // --- Completed work: credits that still count, one per task.
  const credits = countedCredits(state.workEvents).filter((e) => e.at >= from && e.at < to)
  const byTask = new Map<ID, (typeof credits)[number]>()
  for (const c of credits) byTask.set(c.taskId, c)
  const groups = new Map<string, CompletedGroup>()
  for (const c of byTask.values()) {
    const task = state.tasks.find((t) => t.id === c.taskId)
    const projectId = (c.projectId !== undefined ? c.projectId : task?.projectId) ?? null
    const key = projectId ?? 'none'
    const group = groups.get(key) ?? {
      projectId,
      label: state.projects.find((p) => p.id === projectId)?.title ?? 'Other work',
      items: [],
    }
    group.items.push({ taskId: c.taskId, title: task?.title ?? c.taskTitle ?? 'Removed task', exists: Boolean(task) })
    groups.set(key, group)
  }
  const completed = [...groups.values()].sort((a, b) => b.items.length - a.items.length)

  // --- Tasks added this week (including ones deleted since).
  const createdIds = new Set<ID>()
  for (const t of state.tasks) if (t.createdAt >= from && t.createdAt < to) createdIds.add(t.id)
  for (const e of state.events)
    if (e.type === 'task.created' && e.taskId && e.at >= from && e.at < to) createdIds.add(e.taskId)

  // --- Goals: did they move?
  const activeGoals = state.goals.filter((g) => g.status === 'active')
  // A completion counts toward the goal its task serves now (one rule: goalIdOf),
  // or, for a task deleted since, the goal recorded when it was completed.
  const goalOfCredit = (c: (typeof credits)[number]): ID | null => {
    const task = state.tasks.find((t) => t.id === c.taskId)
    return task ? goalIdOf(state, task) : (c.goalId ?? null)
  }
  // Every goal that was live during this week: active ones, plus any that moved or
  // were completed in it. Goals finished before the week began are left out.
  const goals: GoalWeek[] = state.goals
    .filter((g) => g.createdAt < to)
    .filter((g) => !((g.completedAt && g.completedAt < from) || (g.archivedAt && g.archivedAt < from)))
    .map((goal) => {
      const goalCredits = [...byTask.values()].filter((c) => goalOfCredit(c) === goal.id)
      return {
        goal,
        change: goalProgressChange(state, goal.id, from, to),
        projectsWorked: new Set(goalCredits.map((c) => c.projectId).filter(Boolean)).size,
        tasksCompleted: goalCredits.length,
        completedThisWeek: Boolean(goal.completedAt && goal.completedAt >= from && goal.completedAt < to),
        consistency: goal.kind === 'ongoing' ? weekConsistency(state, goal.id, start, end, today) : null,
      }
    })
    .filter((g) => g.goal.status === 'active' || g.completedThisWeek || g.tasksCompleted > 0 || g.change > 0)

  // --- Attention needed (only meaningful for the current week).
  const attention: AttentionItem[] = []
  if (isCurrent) {
    const recent = countedCredits(state.workEvents).filter((e) => daysBetween(e.at.slice(0, 10), today) <= STALE_DAYS)
    const open = state.tasks.filter((t) => t.status === 'open')
    for (const t of open.filter((t) => !t.recurrenceId && t.dueOn && t.dueOn < today)) {
      attention.push({
        key: `overdue-${t.id}`,
        title: t.title,
        reason: 'Overdue',
        to: t.projectId ? `/projects/${t.projectId}` : '/tasks',
        taskId: t.id,
      })
    }
    for (const { task, reason } of selectReview(state, today).stuck) {
      if (attention.some((a) => a.taskId === task.id)) continue
      attention.push({
        key: `stuck-${task.id}`,
        title: task.title,
        reason,
        to: task.projectId ? `/projects/${task.projectId}` : '/tasks',
        taskId: task.id,
      })
    }
    // Only things old enough to have stalled: nothing created in the last 14 days is flagged.
    const oldEnough = (createdAt: string) => daysBetween(createdAt.slice(0, 10), today) >= STALE_DAYS
    for (const p of state.projects.filter((p) => p.status === 'active' && oldEnough(p.createdAt))) {
      const hasOpen = open.some((t) => t.projectId === p.id)
      const moved = recent.some((e) => e.projectId === p.id)
      if (hasOpen && !moved)
        attention.push({
          key: `project-${p.id}`,
          title: p.title,
          reason: `No progress in ${STALE_DAYS} days`,
          to: `/projects/${p.id}`,
        })
    }
    for (const g of activeGoals.filter((g) => oldEnough(g.createdAt))) {
      const goalTaskIds = new Set(tasksForGoal(state, g.id).map((t) => t.id))
      const moved = recent.some((e) => goalTaskIds.has(e.taskId) || e.goalId === g.id)
      if (!moved)
        attention.push({
          key: `goal-${g.id}`,
          title: g.title,
          reason: 'Goal with no recent activity',
          to: `/goals/${g.id}`,
        })
    }
  }

  // --- Next week: the engine's top picks, minus anything already decided this week.
  let recommendations: Recommendation[] = []
  if (isCurrent) {
    const weekFrom = startOfDayIso(weekStartOf(today))
    const decisions = new Map<ID, 'accepted' | 'rejected'>()
    for (const e of state.events) {
      if (e.at < weekFrom || !e.taskId) continue
      if (e.type === 'recommendation.accepted') decisions.set(e.taskId, 'accepted')
      if (e.type === 'recommendation.rejected') decisions.set(e.taskId, 'rejected')
    }
    const decided: Recommendation[] = []
    for (const [id, decision] of decisions) {
      const task = state.tasks.find((t) => t.id === id)
      if (task)
        decided.push({
          ranked: { task, score: 0, reasons: [] as string[], why: [], blocked: false, suppressed: false },
          decision,
        })
    }
    const pending = suggestable(state, today)
      .filter((r) => !decisions.has(r.task.id))
      // Today's own list is already in hand; recommend what to line up next.
      .filter((r) => !isForToday(r.task, today))
      .slice(0, Math.max(0, RECOMMENDATIONS - decided.filter((d) => d.decision === 'accepted').length))
      .map((ranked) => ({ ranked, decision: null }))
    recommendations = [...decided.filter((d) => d.decision === 'accepted'), ...pending]
  }

  return {
    start,
    end,
    isCurrent,
    summary: {
      completed: byTask.size,
      created: createdIds.size,
      overdue: isCurrent
        ? state.tasks.filter((t: Task) => t.status === 'open' && !t.recurrenceId && t.dueOn !== null && t.dueOn < today)
            .length
        : null,
      projectsWorked: new Set([...byTask.values()].map((c) => c.projectId).filter(Boolean)).size,
      goalsMoved: goals.filter((g) => g.change > 0 || g.tasksCompleted > 0).length,
    },
    completed,
    attention,
    goals,
    routines: routinesForWeek(state, start, today),
    recommendations,
    nextWeekStart,
  }
}
