import { Ellipsis } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useUi } from '@/app/ui-context'
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from '@/components/ui/Menu'
import { addDays } from '@/lib/dates'
import { isForToday } from '@/store/selectors'
import { useStore } from '@/store/store'
import type { Task } from '@/types'
import { useTaskActions } from './useTaskActions'

/** Every way to correct MYOS about one task, in one quiet menu. */
export function TaskActionsMenu({ task }: { task: Task }) {
  const navigate = useNavigate()
  const { today } = useStore()
  const { editTask, askWaiting } = useUi()
  const actions = useTaskActions('menu')
  const forToday = isForToday(task, today)
  const forTomorrow = task.plannedFor === addDays(today, 1)
  const importance = task.signals.userImportance
  const open = task.status === 'open'

  return (
    <Menu>
      <MenuTrigger
        aria-label={`More actions for “${task.title}”`}
        className="grid size-8 shrink-0 place-items-center rounded-lg text-faint transition-colors hover:bg-hover hover:text-ink data-[state=open]:bg-hover data-[state=open]:text-ink"
      >
        <Ellipsis className="size-4" />
      </MenuTrigger>
      <MenuContent>
        {open ? <MenuItem onSelect={() => navigate(`/focus/${task.id}`)}>Start focus</MenuItem> : null}
        <MenuItem onSelect={() => editTask(task.id)}>Edit details</MenuItem>
        {open ? (
          <>
            <MenuSeparator />
            {!forToday ? <MenuItem onSelect={() => actions.plan(task.id, 'today')}>Do today</MenuItem> : null}
            {!forTomorrow ? <MenuItem onSelect={() => actions.plan(task.id, 'tomorrow')}>Do tomorrow</MenuItem> : null}
            {task.plannedFor !== null ? (
              <MenuItem onSelect={() => actions.plan(task.id, 'later')}>Do later</MenuItem>
            ) : null}
            <MenuItem onSelect={() => editTask(task.id)}>Change deadline</MenuItem>
            <MenuSeparator />
            {importance !== 'high' ? (
              <MenuItem onSelect={() => actions.setImportance(task.id, 'high')}>Make important</MenuItem>
            ) : null}
            {importance !== 'low' ? (
              <MenuItem onSelect={() => actions.setImportance(task.id, 'low')}>Not important</MenuItem>
            ) : null}
            {importance !== 'normal' ? (
              <MenuItem onSelect={() => actions.setImportance(task.id, 'normal')}>Normal importance</MenuItem>
            ) : null}
            <MenuSeparator />
            {task.waitingOn ? (
              <MenuItem onSelect={() => actions.setWaiting(task.id, null)}>No longer waiting</MenuItem>
            ) : (
              <MenuItem onSelect={() => askWaiting(task.id)}>Mark as waiting</MenuItem>
            )}
            {task.suppressed ? (
              <MenuItem onSelect={() => actions.setSuppressed(task.id, false)}>Suggest again</MenuItem>
            ) : (
              <MenuItem onSelect={() => actions.setSuppressed(task.id, true)}>Don't suggest this</MenuItem>
            )}
          </>
        ) : null}
        <MenuSeparator />
        <MenuItem danger onSelect={() => actions.remove(task.id)}>
          Remove
        </MenuItem>
      </MenuContent>
    </Menu>
  )
}
