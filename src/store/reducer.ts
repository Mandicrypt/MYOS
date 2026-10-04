import { meaningfulPoints } from '@/engine/meaningful-work'
import { newId } from '@/lib/id'
import type { AppState, ID, ISODate, Project, Settings, Task, UserImportance } from '@/types'

export type NewTask = Pick<Task, 'title'> &
  Partial<Pick<Task, 'plannedFor' | 'projectId' | 'goalId' | 'dueOn' | 'description'>>

export type Action =
  | { type: 'task/add'; task: NewTask; id?: ID }
  | { type: 'task/update'; id: ID; patch: Partial<Omit<Task, 'id'>> }
  | { type: 'task/complete'; id: ID }
  | { type: 'task/reopen'; id: ID }
  | { type: 'task/plan'; id: ID; plannedFor: ISODate | null }
  | { type: 'task/importance'; id: ID; level: UserImportance }
  | { type: 'task/checklist'; id: ID; itemId: ID }
  | { type: 'task/delete'; id: ID }
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
        createdAt: now(),
        completedAt: null,
      }
      return { ...state, tasks: [...state.tasks, t] }
    }
    case 'task/update':
      return updateTask(state, action.id, (t) => ({ ...t, ...action.patch }))
    case 'task/complete': {
      const task = state.tasks.find((t) => t.id === action.id)
      if (!task || task.status === 'done') return state
      const at = now()
      const next = updateTask(state, action.id, (t) => ({ ...t, status: 'done', completedAt: at }))
      return {
        ...next,
        workEvents: [...state.workEvents, { id: newId(), taskId: task.id, points: meaningfulPoints(task, state), at }],
      }
    }
    case 'task/reopen':
      return {
        ...updateTask(state, action.id, (t) => ({ ...t, status: 'open', completedAt: null })),
        workEvents: state.workEvents.filter((e) => e.taskId !== action.id),
      }
    case 'task/plan':
      return updateTask(state, action.id, (t) => ({ ...t, plannedFor: action.plannedFor }))
    case 'task/importance':
      return updateTask(state, action.id, (t) => ({ ...t, signals: { ...t.signals, userImportance: action.level } }))
    case 'task/checklist':
      return updateTask(state, action.id, (t) => ({
        ...t,
        checklist: t.checklist.map((c) => (c.id === action.itemId ? { ...c, done: !c.done } : c)),
      }))
    case 'task/delete':
      return {
        ...state,
        tasks: state.tasks
          .filter((t) => t.id !== action.id)
          .map((t) =>
            t.dependsOn.includes(action.id) ? { ...t, dependsOn: t.dependsOn.filter((d) => d !== action.id) } : t,
          ),
        workEvents: state.workEvents.filter((e) => e.taskId !== action.id),
      }
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
