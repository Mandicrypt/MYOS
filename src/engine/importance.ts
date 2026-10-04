import { daysBetween, friendlyDay } from '@/lib/dates'
import type { Task } from '@/types'
import { allDependents, directDependents, goalOf, isBlocked, milestoneOf, projectOf } from './relations'
import type { EngineContext, PriorityEngine, RankedTask, Reason } from './types'

/**
 * Rule-based importance engine.
 *
 * Each factor returns a Reason with a weight. The score is the sum of the
 * weights, and the strongest reasons become the explanation the user sees.
 * To tune MYOS, change a factor here. Screens never read the numbers.
 */

const NONE: Reason[] = []
const reason = (key: string, weight: number, short: string | null, long: string | null): Reason[] => [
  { key, weight, short, long },
]

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)

/** How much the work matters on its own. The biggest single factor. */
function impact(task: Task): Reason[] {
  const w = task.signals.impact * 3.2
  if (task.signals.impact >= 4)
    return reason('impact', w, 'High impact', 'It makes a real difference to what you are building.')
  return reason('impact', w, null, null)
}

/** What happens if it slips. */
function consequence(task: Task): Reason[] {
  const w = task.signals.consequence * 1.6
  if (task.signals.consequence >= 4)
    return reason('consequence', w, 'Costly to delay', 'Letting it slip would cost you later.')
  return reason('consequence', w, null, null)
}

/** Deadlines on the task, or inherited from its milestone or project. */
function urgency(task: Task, ctx: EngineContext): Reason[] {
  const { state, today } = ctx
  if (task.dueOn) {
    const days = daysBetween(today, task.dueOn)
    if (days < 0) return reason('overdue', 15, 'Overdue', `It was due ${friendlyDay(task.dueOn, today)}.`)
    if (days === 0) return reason('due', 13, 'Due today', 'It is due today.')
    if (days === 1) return reason('due', 10, 'Due tomorrow', 'It is due tomorrow.')
    if (days <= 3)
      return reason('due', 6, `Due ${friendlyDay(task.dueOn, today)}`, `It is due ${friendlyDay(task.dueOn, today)}.`)
    if (days <= 7) return reason('due', 3, null, `It is due ${friendlyDay(task.dueOn, today)}.`)
    return reason('due', 1, null, null)
  }
  const milestone = milestoneOf(state, task)
  if (milestone?.dueOn && !milestone.done) {
    const days = daysBetween(today, milestone.dueOn)
    if (days <= 3) {
      const when = friendlyDay(milestone.dueOn, today)
      return reason(
        'milestone',
        days <= 0 ? 8 : 5,
        `${milestone.title} due ${when}`,
        `Its milestone, ${milestone.title}, is due ${when}.`,
      )
    }
  }
  const project = projectOf(state, task)
  if (project?.deadline && daysBetween(today, project.deadline) <= 7) {
    return reason(
      'project-deadline',
      3,
      null,
      `${project.title} has a deadline ${friendlyDay(project.deadline, today)}.`,
    )
  }
  return NONE
}

/** Work that serves an active goal beats work that serves nothing. */
function alignment(task: Task, ctx: EngineContext): Reason[] {
  const goal = goalOf(ctx.state, task)
  const project = projectOf(ctx.state, task)
  if (goal) {
    const short = project ? `Moves ${project.title} forward` : `Supports “${goal.title}”`
    return reason('goal', 4, short, `It moves you toward ${goal.title}.`)
  }
  if (project) return reason('project', 2, null, null)
  return reason('unaligned', 0, null, null)
}

/**
 * The user's own say. "Important" is worth a lot, but only while it stays
 * rare: if most tasks are marked important, each mark counts for less.
 */
function userImportance(task: Task, ctx: EngineContext): Reason[] {
  const level = task.signals.userImportance
  if (level === 'normal') return NONE
  if (level === 'low') return reason('user-low', -6, null, null)
  const open = ctx.state.tasks.filter((t) => t.status === 'open')
  const share = open.filter((t) => t.signals.userImportance === 'high').length / Math.max(1, open.length)
  const scarcity = share <= 0.25 ? 1 : 0.25 / share
  return reason('user-high', 9 * scarcity, 'Important to you', 'You marked it as important.')
}

/** Finishing this lets other work start. Counts tasks further down the chain too. */
function unblocking(task: Task, ctx: EngineContext): Reason[] {
  const direct = directDependents(ctx.state, task)
  if (!direct.length) return NONE
  const all = allDependents(ctx.state, task)
  const weight = 4 + Math.min(3, all.length - 1) * 2 + all.filter((t) => t.signals.impact >= 4).length
  if (all.length === 1) {
    return reason(
      'unblocks',
      weight,
      `Unblocks ${lowerFirst(direct[0].title)}`,
      `“${direct[0].title}” can't start until this is done.`,
    )
  }
  return reason(
    'unblocks',
    weight,
    `Blocking ${plural(all.length, 'task')}`,
    `${plural(all.length, 'other task')} can't start until this is done.`,
  )
}

/** The user planned it for today. Respect that, gently. */
function plannedToday(task: Task, ctx: EngineContext): Reason[] {
  if (task.plannedFor && task.plannedFor <= ctx.today) return reason('planned', 2, null, null)
  return NONE
}

/** Moved again and again: worth facing, or breaking down. */
function postponed(task: Task): Reason[] {
  if (task.postponeCount < 2) return NONE
  const w = Math.min(3, task.postponeCount - 1) * 1.5
  return reason(
    'postponed',
    w,
    `Put off ${task.postponeCount} times`,
    `You've moved it ${task.postponeCount} times. A small first step might help.`,
  )
}

/** Keep a project moving if it was worked on recently. */
function momentum(task: Task, ctx: EngineContext): Reason[] {
  const project = projectOf(ctx.state, task)
  if (!project) return NONE
  const recent = ctx.state.workEvents.some(
    (e) => e.projectId === project.id && daysBetween(e.at.slice(0, 10), ctx.today) <= 2,
  )
  return recent
    ? reason('momentum', 1.5, `Keeps ${project.title} moving`, `You've been making progress on ${project.title}.`)
    : NONE
}

/**
 * Effort. A small task gets a tiny nudge only when it's also worth doing,
 * so trivial quick wins never jump ahead of meaningful work.
 */
function effort(task: Task): Reason[] {
  const minutes = task.effortMinutes
  if (minutes === null) return NONE
  if (minutes <= 30 && task.signals.impact >= 3)
    return reason('small-and-useful', 1, 'Easy to finish today', 'It won’t take long.')
  if (minutes <= 15) return reason('small', 0, 'Small task', null)
  return NONE
}

const FACTORS = [
  impact,
  consequence,
  urgency,
  alignment,
  userImportance,
  unblocking,
  plannedToday,
  postponed,
  momentum,
  effort,
]

/** Labels that say nearly the same thing. Only the first one is shown. */
const OVERLAPS: string[][] = [
  ['user-high', 'impact'],
  ['overdue', 'due', 'milestone'],
  ['goal', 'momentum'],
]

function pickLabels(why: Reason[]): string[] {
  const labels: string[] = []
  const used = new Set<string>()
  for (const r of why) {
    if (!r.short || r.weight <= 0) continue
    const group = OVERLAPS.find((g) => g.includes(r.key))
    if (group && group.some((k) => used.has(k))) continue
    labels.push(r.short)
    used.add(r.key)
    if (labels.length === 2) break
  }
  return labels
}

export function explain(task: Task, ctx: EngineContext): { score: number; why: Reason[] } {
  const why = FACTORS.flatMap((f) => f(task, ctx)).sort((a, b) => b.weight - a.weight)
  return { score: why.reduce((sum, r) => sum + r.weight, 0), why }
}

export const ruleBasedEngine: PriorityEngine = {
  rank(tasks, ctx) {
    return tasks
      .map<RankedTask>((task) => {
        const { score, why } = explain(task, ctx)
        const blocked = isBlocked(ctx.state, task)
        let reasons = pickLabels(why)
        // A small task that ended up near the top gets an honest label.
        if (!reasons.length && why.some((r) => r.key === 'small')) reasons = ['Small task']
        return { task, score, why, reasons, blocked, suppressed: task.suppressed }
      })
      .sort((a, b) => Number(a.blocked || a.suppressed) - Number(b.blocked || b.suppressed) || b.score - a.score)
  },
}

/** The engine in use. Swap this one line to change how MYOS decides. */
export const engine: PriorityEngine = ruleBasedEngine

export { isBlocked } from './relations'
