import { useUi } from '@/app/ui-context'
import { Checkbox } from '@/components/ui/Checkbox'
import { addDays, friendlyDay } from '@/lib/dates'
import { cn } from '@/lib/cn'
import { projectFor, waitingReason } from '@/store/selectors'
import { useStore } from '@/store/store'
import type { Task } from '@/types'
import { TaskActionsMenu } from './TaskActionsMenu'
import { useTaskActions } from './useTaskActions'

type TaskRowProps = {
  task: Task
  /** Hide the project name (e.g. inside a project page). */
  hideProject?: boolean
  /** Show the engine's short reason instead of the due date. */
  reason?: string
}

export function TaskRow({ task, hideProject, reason }: TaskRowProps) {
  const { state, today } = useStore()
  const { editTask } = useUi()
  const { complete, reopen } = useTaskActions()
  const done = task.status === 'done'
  const project = projectFor(state, task)
  const waiting = done ? null : waitingReason(state, task)

  const meta: string[] = []
  if (!hideProject && project) meta.push(project.title)
  if (waiting) meta.push(waiting)
  else if (reason) meta.push(reason)
  else if (!done && task.dueOn && task.dueOn >= today) meta.push(`Due ${friendlyDay(task.dueOn, today)}`)
  else if (!done && task.plannedFor && task.plannedFor > addDays(today, 1))
    meta.push(`Planned ${friendlyDay(task.plannedFor, today)}`)
  if (!done && task.signals.userImportance === 'high' && !reason) meta.push('Important')

  return (
    <li className="group flex items-start gap-3.5 py-3">
      <span className="pt-px">
        <Checkbox
          checked={done}
          onChange={() => (done ? reopen(task.id) : complete(task.id))}
          label={done ? `Mark “${task.title}” as not done` : `Complete “${task.title}”`}
        />
      </span>
      <button type="button" onClick={() => editTask(task.id)} className="min-w-0 flex-1 rounded-md text-left">
        <span
          className={cn('block text-base', done ? 'text-muted line-through decoration-[var(--control)]' : 'text-ink')}
        >
          {task.title}
        </span>
        {meta.length ? <span className="mt-0.5 block text-sm text-muted">{meta.join(' · ')}</span> : null}
      </button>
      <span className="opacity-100 transition-opacity md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
        <TaskActionsMenu task={task} />
      </span>
    </li>
  )
}
