import { scoreCompletion, SCORING_VERSION } from '@/engine/meaningful-work'
import { goalOf, isBlocked, newlyUnblockedBy, wouldCreateCycle } from '@/engine/relations'
import { daysBetween, todayISO } from '@/lib/dates'
import { newId } from '@/lib/id'
import type { ActionSource, AppState, ID, ISODate, Project, Settings, Task, TaskOrigin, UserImportance } from '@/types'
import { record } from './events'

export type NewTask = Pick<Task, 'title'> &
  Partial<Pick<Task, 'plannedFor' | 'projectId' | 'goalId' | 'dueOn' | 'description'>> & { origin?: TaskOrigin }

/** Every task action can say where it came from and whether MYOS was suggesting it. */
type Meta = { source?: ActionSource; wasSuggested?: boolean }

export type Action =
  | ({ type: 'task/add'; task: NewTask; id?: ID } & Meta)
  | ({ type: 'task/update'; id: ID; patch: Partial<Omit<Task, 'id'>> } & Meta)
  | ({ type: 'task/complete'; id: ID } & Meta)
  | ({ type: 'task/reopen'; id: ID } & Meta)
  | ({ type: 'task/plan'; id: ID; plannedFor: ISODate | null } & Meta)
  | ({ type: 'task/skip'; id: ID; plannedFor: ISODate | null } & Meta)
  | ({ type: 'task/importance'; id: ID; level: UserImportance } & Meta)
  | ({ type: 'task/deadline'; id: ID; dueOn: ISODate | null } & Meta)
  | ({ type: 'task/waiting'; id: ID; waitingOn: string | null } & Meta)
  | ({ type: 'task/suppress'; id: ID; suppressed: boolean } & Meta)
  | ({ type: 'task/depend'; id: ID; on: ID } & Meta)
  | ({ type: 'task/undepend'; id: ID; on: ID } & Meta)
  | { type: 'task/checklist'; id: ID; itemId: ID }
  | ({ type: 'task/delete'; id: ID } & Meta)
  | { type: 'inbox/add'; text: string }
  | { type: 'inbox/remove'; id: ID }
  | { type: 'note/add'; id: ID; title?: string; body?: string; projectId?: ID | null }
  | { type: 'note/update'; id: ID; patch: { title?: string; body?: string; projectId?: ID | null } }
  | { type: 'note/delete'; id: ID }
  | { type: 'project/add'; id?: ID; title: string; summary?: string }
  | { type: 'project/update'; id: ID; patch: Partial<Omit<Project, 'id'>> }
  | { type: 'goal/add'; id?: ID; title: string; why?: string }
  | { type: 'settings/update'; patch: Partial<Settings> }
  | { type: 'state/replace'; state: AppState }

const now = () => new Date().toISOString()

const updateTask = (state: AppState, id: ID, fn: (t: Task) => Task): AppState => ({
  ...state,
  tasks: state.tasks.map((t) => (t.id === id ? fn(t) : t)),
})

const meta = (a: Meta) => ({ source: a.source, wasSuggested: a.wasSuggested })

/** Moving a task to a later day than it had. "Later" (no day) counts too. */
function isPostpone(from: ISODate | null, to: ISODate | null): boolean {
  if (from === null) return false
  if (to === null) return true
  return to > from && to > todayISO()
}

/** Changing the planned day: records a plan or a postpone, and counts postpones. */
function plan(state: AppState, task: Task, plannedFor: ISODate | null, a: Meta, skipped = false): AppState {
  const effectiveFrom = task.plannedFor && task.plannedFor < todayISO() ? todayISO() : task.plannedFor
  const postponing =
    isPostpone(effectiveFrom, plannedFor) ||
    (task.dueOn !== null && task.dueOn <= todayISO() && plannedFor !== null && plannedFor > todayISO())
  let next = updateTask(state, task.id, (t) => ({
    ...t,
    plannedFor,
    postponeCount: postponing ? t.postponeCount + 1 : t.postponeCount,
  }))
  if (skipped) next = record(next, 'task.skipped', task.id, meta(a))
  return record(next, postponing ? 'task.postponed' : 'task.planned', task.id, {
    ...meta(a),
    data: { from: task.plannedFor, to: plannedFor },
  })
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'task/add': {
      const t: Task = {
        id: action.id ?? newId(),
        title: action.task.title,
        description: action.task.description,
        status: 'open',
        projectId: action.task.projectId ?? null,
        goalId: action.task.goalId ?? null,
        milestoneId: null,
        plannedFor: action.task.plannedFor ?? null,
        dueOn: action.task.dueOn ?? null,
        effortMinutes: null,
        signals: { impact: 3, consequence: 2, userImportance: 'normal' },
        dependsOn: [],
        checklist: [],
        links: [],
        noteIds: [],
        suppressed: false,
        postponeCount: 0,
        origin: action.task.origin ?? 'user',
        parentId: null,
        createdAt: now(),
        completedAt: null,
      }
      return record({ ...state, tasks: [...state.tasks, t] }, 'task.created', t.id, {
        ...meta(action),
        data: { origin: t.origin },
      })
    }

    case 'task/update': {
      // Edits from the task editor. Changes that teach MYOS something are recorded individually.
      const before = state.tasks.find((t) => t.id === action.id)
      if (!before) return state
      const { plannedFor, dueOn, signals, ...rest } = action.patch
      let next = updateTask(state, action.id, (t) => ({ ...t, ...rest }))
      if (plannedFor !== undefined && plannedFor !== before.plannedFor) next = plan(next, before, plannedFor, action)
      if (dueOn !== undefined && dueOn !== before.dueOn)
        next = reducer(next, { type: 'task/deadline', id: action.id, dueOn, ...meta(action) })
      if (signals && signals.userImportance !== before.signals.userImportance)
        next = reducer(next, { type: 'task/importance', id: action.id, level: signals.userImportance, ...meta(action) })
      if (signals) next = updateTask(next, action.id, (t) => ({ ...t, signals: { ...signals } }))
      return next
    }

    case 'task/complete': {
      const task = state.tasks.find((t) => t.id === action.id)
      if (!task || task.status === 'done') return state
      const at = new Date()
      const { points, breakdown } = scoreCompletion(task, state, at)
      let next = updateTask(state, action.id, (t) => ({ ...t, status: 'done', completedAt: at.toISOString() }))
      next = {
        ...next,
        workEvents: [
          ...next.workEvents,
          {
            id: newId(),
            taskId: task.id,
            points,
            at: at.toISOString(),
            breakdown,
            projectId: task.projectId,
            goalId: goalOf(state, task)?.id ?? null,
            scoringVersion: SCORING_VERSION,
          },
        ],
      }
      const today = todayISO()
      next = record(next, 'task.completed', task.id, {
        ...meta(action),
        data: {
          points,
          daysAfterPlanned: task.plannedFor ? daysBetween(task.plannedFor, today) : null,
          daysAfterDue: task.dueOn ? daysBetween(task.dueOn, today) : null,
          postponeCount: task.postponeCount,
        },
      })
      for (const t of newlyUnblockedBy(state, next, task.id)) {
        next = record(next, 'task.unblocked', t.id, { data: { by: task.id } })
      }
      return next
    }

    case 'task/reopen':
      return record(
        {
          ...updateTask(state, action.id, (t) => ({ ...t, status: 'open', completedAt: null })),
          workEvents: state.workEvents.filter((e) => e.taskId !== action.id),
        },
        'task.reopened',
        action.id,
        meta(action),
      )

    case 'task/plan':
    case 'task/skip': {
      const task = state.tasks.find((t) => t.id === action.id)
      return task ? plan(state, task, action.plannedFor, action, action.type === 'task/skip') : state
    }

    case 'task/importance': {
      const task = state.tasks.find((t) => t.id === action.id)
      if (!task || task.signals.userImportance === action.level) return state
      return record(
        updateTask(state, action.id, (t) => ({ ...t, signals: { ...t.signals, userImportance: action.level } })),
        'task.importance_changed',
        action.id,
        { ...meta(action), data: { from: task.signals.userImportance, to: action.level } },
      )
    }

    case 'task/deadline': {
      const task = state.tasks.find((t) => t.id === action.id)
      if (!task || task.dueOn === action.dueOn) return state
      return record(
        updateTask(state, action.id, (t) => ({ ...t, dueOn: action.dueOn })),
        'task.deadline_changed',
        action.id,
        {
          ...meta(action),
          data: { from: task.dueOn, to: action.dueOn },
        },
      )
    }

    case 'task/waiting': {
      const waitingOn = action.waitingOn?.trim() || null
      const task = state.tasks.find((t) => t.id === action.id)
      if (!task) return state
      const next = updateTask(state, action.id, (t) => ({ ...t, waitingOn: waitingOn ?? undefined }))
      return record(next, waitingOn ? 'task.waiting_set' : 'task.waiting_cleared', action.id, {
        ...meta(action),
        data: waitingOn ? { on: waitingOn } : undefined,
      })
    }

    case 'task/suppress':
      return record(
        updateTask(state, action.id, (t) => ({ ...t, suppressed: action.suppressed })),
        action.suppressed ? 'task.suppressed' : 'task.unsuppressed',
        action.id,
        meta(action),
      )

    case 'task/depend': {
      const task = state.tasks.find((t) => t.id === action.id)
      if (!task || task.dependsOn.includes(action.on) || wouldCreateCycle(state, action.id, action.on)) return state
      const next = updateTask(state, action.id, (t) => ({ ...t, dependsOn: [...t.dependsOn, action.on] }))
      return record(next, 'task.dependency_added', action.id, {
        ...meta(action),
        data: { on: action.on, blocked: isBlocked(next, { ...task, dependsOn: [...task.dependsOn, action.on] }) },
      })
    }

    case 'task/undepend':
      return record(
        updateTask(state, action.id, (t) => ({ ...t, dependsOn: t.dependsOn.filter((d) => d !== action.on) })),
        'task.dependency_removed',
        action.id,
        { ...meta(action), data: { on: action.on } },
      )

    case 'task/checklist':
      return updateTask(state, action.id, (t) => ({
        ...t,
        checklist: t.checklist.map((c) => (c.id === action.itemId ? { ...c, done: !c.done } : c)),
      }))

    case 'task/delete':
      return record(
        {
          ...state,
          tasks: state.tasks
            .filter((t) => t.id !== action.id)
            .map((t) =>
              t.dependsOn.includes(action.id) ? { ...t, dependsOn: t.dependsOn.filter((d) => d !== action.id) } : t,
            ),
          workEvents: state.workEvents.filter((e) => e.taskId !== action.id),
        },
        'task.deleted',
        action.id,
        meta(action),
      )

    case 'inbox/add':
      return { ...state, inbox: [{ id: newId(), text: action.text, createdAt: now() }, ...state.inbox] }
    case 'inbox/remove':
      return { ...state, inbox: state.inbox.filter((i) => i.id !== action.id) }
    case 'note/add':
      return {
        ...state,
        notes: [
          {
            id: action.id,
            title: action.title ?? '',
            body: action.body ?? '',
            projectId: action.projectId ?? null,
            updatedAt: now(),
          },
          ...state.notes,
        ],
      }
    case 'note/update':
      return {
        ...state,
        notes: state.notes.map((n) => (n.id === action.id ? { ...n, ...action.patch, updatedAt: now() } : n)),
      }
    case 'note/delete':
      return {
        ...state,
        notes: state.notes.filter((n) => n.id !== action.id),
        tasks: state.tasks.map((t) =>
          t.noteIds.includes(action.id) ? { ...t, noteIds: t.noteIds.filter((n) => n !== action.id) } : t,
        ),
      }
    case 'project/add':
      return {
        ...state,
        projects: [
          ...state.projects,
          {
            id: action.id ?? newId(),
            title: action.title,
            summary: action.summary ?? '',
            goalId: null,
            status: 'active',
            deadline: null,
            createdAt: now(),
          },
        ],
      }
    case 'project/update':
      return { ...state, projects: state.projects.map((p) => (p.id === action.id ? { ...p, ...action.patch } : p)) }
    case 'goal/add':
      return {
        ...state,
        goals: [
          ...state.goals,
          { id: action.id ?? newId(), title: action.title, why: action.why ?? '', status: 'active', createdAt: now() },
        ],
      }
    case 'settings/update':
      return { ...state, settings: { ...state.settings, ...action.patch } }
    case 'state/replace':
      return action.state
  }
}
