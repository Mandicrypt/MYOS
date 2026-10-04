import { daysBetween } from '@/lib/dates'
import type { Task } from '@/types'
import type { EngineContext, PriorityEngine, RankedTask } from './types'

const WEIGHTS = {
  impact: 3,
  urgency: 2.5,
  consequence: 1.5,
  goalAlignment: 3,
  userImportance: 4,
  unblocks: 2,
  quickWin: 1,
}

function urgency(task: Task, ctx: EngineContext): number {
  if (!task.dueOn) return 1
  const days = daysBetween(ctx.today, task.dueOn)
  if (days <= 0) return 5
  if (days === 1) return 4
  if (days <= 3) return 3
  if (days <= 7) return 2
  return 1
}

function goalAlignment(task: Task, ctx: EngineContext): number {
  if (task.goalId) return 1
  const project = ctx.state.projects.find((p) => p.id === task.projectId)
  return project?.goalId ? 1 : 0.4
}

export function isBlocked(task: Task, ctx: EngineContext): boolean {
  if (task.waitingOn) return true
  return task.dependsOn.some((id) => ctx.state.tasks.find((t) => t.id === id)?.status === 'open')
}

function dependents(task: Task, ctx: EngineContext): Task[] {
  return ctx.state.tasks.filter((t) => t.status === 'open' && t.dependsOn.includes(task.id))
}

function reasonsFor(task: Task, ctx: EngineContext): string[] {
  const reasons: string[] = []
  if (task.dueOn) {
    const days = daysBetween(ctx.today, task.dueOn)
    if (days < 0) reasons.push('Past its date')
    else if (days === 0) reasons.push('Due today')
    else if (days === 1) reasons.push('Due tomorrow')
  }
  const unblocks = dependents(task, ctx)
  if (unblocks.length) {
    const project = ctx.state.projects.find((p) => p.id === unblocks[0].projectId)
    reasons.push(project ? `Unblocks ${project.title}` : 'Unblocks other work')
  }
  if (task.signals.userImportance === 'high') reasons.unshift('Important to you')
  else if (task.signals.impact >= 4) reasons.unshift('High impact')
  return reasons.slice(0, 2)
}

export const ruleBasedEngine: PriorityEngine = {
  rank(tasks, ctx) {
    return tasks
      .map<RankedTask>((task) => {
        const blocked = isBlocked(task, ctx)
        const userImp = { low: -1, normal: 0, high: 1 }[task.signals.userImportance]
        const quickWin = task.effortMinutes !== null && task.effortMinutes <= 30 ? 1 : 0
        const score =
          task.signals.impact * WEIGHTS.impact +
          urgency(task, ctx) * WEIGHTS.urgency +
          task.signals.consequence * WEIGHTS.consequence +
          goalAlignment(task, ctx) * WEIGHTS.goalAlignment +
          userImp * WEIGHTS.userImportance +
          Math.min(2, dependents(task, ctx).length) * WEIGHTS.unblocks +
          quickWin * WEIGHTS.quickWin
        return { task, score: blocked ? score - 100 : score, reasons: reasonsFor(task, ctx), blocked }
      })
      .sort((a, b) => b.score - a.score)
  },
}

/** The engine in use. Swap this one line to change how MYOS decides. */
export const engine: PriorityEngine = ruleBasedEngine
