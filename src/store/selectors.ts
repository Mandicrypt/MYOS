import { engine } from '@/engine/importance'
import { isForToday, suggestable } from '@/engine/next'
import { isBlocked } from '@/engine/relations'
import type { EngineContext, RankedTask } from '@/engine/types'
import { addDays, daysBetween } from '@/lib/dates'
import type { AppState, Goal, ID, ISODate, Project, Task } from '@/types'

export function rankOpen(state: AppState, today: ISODate): RankedTask[] {
  const ctx: EngineContext = { state, today }
  return engine.rank(
    state.tasks.filter((t) => t.status === 'open'),
    ctx,
  )
}

export { isForToday }

export type HomeView = {
  focus: RankedTask | null
  today: RankedTask[]
  moreToday: number
}

const HOME_LIST_LIMIT = 4

export function selectHome(state: AppState, today: ISODate): HomeView {
  const todays = suggestable(state, today).filter((r) => isForToday(r.task, today))
  const focus = todays[0] ?? null
  const rest = todays.slice(1)
  return { focus, today: rest.slice(0, HOME_LIST_LIMIT), moreToday: Math.max(0, rest.length - HOME_LIST_LIMIT) }
}

/** What Focus should open when no task is chosen. */
export function selectFocusTask(state: AppState, today: ISODate): Task | null {
  const home = selectHome(state, today)
  if (home.focus) return home.focus.task
  return suggestable(state, today)[0]?.task ?? null
}

export type TaskGroups = {
  today: RankedTask[]
  tomorrow: RankedTask[]
  later: RankedTask[]
  waiting: RankedTask[]
  done: Task[]
}

export function selectTaskGroups(state: AppState, today: ISODate): TaskGroups {
  const tomorrow = addDays(today, 1)
  const ranked = rankOpen(state, today)
  const groups: TaskGroups = { today: [], tomorrow: [], later: [], waiting: [], done: [] }
  for (const r of ranked) {
    if (r.blocked) groups.waiting.push(r)
    else if (isForToday(r.task, today)) groups.today.push(r)
    else if (r.task.plannedFor === tomorrow) groups.tomorrow.push(r)
    else groups.later.push(r)
  }
  groups.done = state.tasks
    .filter((t) => t.status === 'done' && t.completedAt && daysBetween(t.completedAt.slice(0, 10), today) <= 7)
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
  return groups
}

export function projectFor(state: AppState, task: Task): Project | undefined {
  return state.projects.find((p) => p.id === task.projectId)
}

export function goalFor(state: AppState, task: Task): Goal | undefined {
  const id = task.goalId ?? projectFor(state, task)?.goalId
  return state.goals.find((g) => g.id === id)
}

/** Why a task can't move yet, in plain words. */
export function waitingReason(state: AppState, task: Task): string | null {
  if (task.waitingOn) return `Waiting for ${task.waitingOn.charAt(0).toLowerCase()}${task.waitingOn.slice(1)}`
  const dep = state.tasks.find((t) => task.dependsOn.includes(t.id) && t.status === 'open')
  return dep ? `After “${dep.title}”` : null
}

export function nextTaskForProject(state: AppState, projectId: ID, today: ISODate): Task | null {
  return suggestable(state, today).find((r) => r.task.projectId === projectId)?.task ?? null
}

export function nextTaskForGoal(state: AppState, goalId: ID, today: ISODate): Task | null {
  const projectIds = state.projects.filter((p) => p.goalId === goalId).map((p) => p.id)
  return (
    suggestable(state, today).find(
      (r) => r.task.goalId === goalId || (r.task.projectId && projectIds.includes(r.task.projectId)),
    )?.task ?? null
  )
}

export function blockedForGoal(state: AppState, goalId: ID): Task[] {
  const projectIds = state.projects.filter((p) => p.goalId === goalId).map((p) => p.id)
  return state.tasks.filter(
    (t) =>
      t.status === 'open' &&
      t.waitingOn &&
      (t.goalId === goalId || (t.projectId && projectIds.includes(t.projectId))) &&
      isBlocked(state, t),
  )
}

export type ProgressLevel = 'Major progress' | 'Good progress' | 'Some progress' | 'Small progress'

export type ReviewView = {
  moved: { label: string; projectId: ID | null; level: ProgressLevel; finished: Task[] }[]
  stuck: { task: Task; reason: string; suggestion: string }[]
  quiet: Project[]
}

export function selectReview(state: AppState, today: ISODate): ReviewView {
  const since = addDays(today, -6)
  const recent = state.workEvents.filter((e) => e.at.slice(0, 10) >= since)
  const byProject = new Map<string, { points: number; tasks: Task[] }>()
  for (const e of recent) {
    const task = state.tasks.find((t) => t.id === e.taskId)
    if (!task) continue
    const key = task.projectId ?? 'personal'
    const entry = byProject.get(key) ?? { points: 0, tasks: [] }
    entry.points += e.points
    entry.tasks.push(task)
    byProject.set(key, entry)
  }
  const level = (p: number): ProgressLevel =>
    p >= 50 ? 'Major progress' : p >= 30 ? 'Good progress' : p >= 15 ? 'Some progress' : 'Small progress'

  const moved = [...byProject.entries()]
    .sort((a, b) => b[1].points - a[1].points)
    .map(([key, v]) => {
      const project = state.projects.find((p) => p.id === key)
      return {
        label: project?.title ?? 'Personal',
        projectId: project?.id ?? null,
        level: level(v.points),
        finished: v.tasks,
      }
    })

  const stuck = state.tasks
    .filter(
      (t) =>
        t.status === 'open' &&
        (t.waitingOn ||
          (t.dueOn && t.dueOn < today) ||
          t.postponeCount >= 2 ||
          (t.plannedFor && daysBetween(t.plannedFor, today) >= 3)),
    )
    .map((task) => {
      if (task.waitingOn)
        return {
          task,
          reason: `Waiting for ${task.waitingOn.charAt(0).toLowerCase()}${task.waitingOn.slice(1)}`,
          suggestion: 'Send a short follow-up tomorrow',
        }
      if (task.dueOn && task.dueOn < today)
        return { task, reason: 'Its date has passed', suggestion: 'Pick a new date, or let it go' }
      return {
        task,
        reason: task.postponeCount >= 2 ? `Put off ${task.postponeCount} times` : 'Planned days ago and still open',
        suggestion: 'Break it into one small first step',
      }
    })

  const active = state.projects.filter((p) => p.status === 'active')
  const quiet = active.filter((p) => !byProject.has(p.id))

  return { moved, stuck, quiet }
}
