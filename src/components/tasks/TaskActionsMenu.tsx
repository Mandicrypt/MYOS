import { Ellipsis } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useUi } from '@/app/ui-context'
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from '@/components/ui/Menu'
import { addDays } from '@/lib/dates'
import { isForToday } from '@/store/selectors'
import { useStore } from '@/store/store'
import type { Task } from '@/types'
import { useTaskActions } from './useTaskActions'

export function TaskActionsMenu({ task }: { task: Task }) {
  const navigate = useNavigate()
  const { today } = useStore()
  const { editTask } = useUi()
  const actions = useTaskActions()
  const forToday = isForToday(task, today)
  const forTomorrow = task.plannedFor === addDays(today, 1)
  const importance = task.signals.userImportance

  return (
    <Menu>
      <MenuTrigger
        aria-label={`More actions for “${task.title}”`}
        className="grid size-8 shrink-0 place-items-center rounded-lg text-faint transition-colors hover:bg-hover hover:text-ink data-[state=open]:bg-hover data-[state=open]:text-ink"
      >
        <Ellipsis className="size-4" />
      </MenuTrigger>
      <MenuContent>
        {task.status === 'open' ? (
          <MenuItem onSelect={() => navigate(`/focus/${task.id}`)}>Start focus</MenuItem>
        ) : null}
        <MenuItem onSelect={() => editTask(task.id)}>Edit details</MenuItem>
        {task.status === 'open' ? (
          <>
            <MenuSeparator />
            {!forToday ? <MenuItem onSelect={() => actions.plan(task.id, 'today')}>Do today</MenuItem> : null}
            {!forTomorrow ? (
              <MenuItem onSelect={() => actions.plan(task.id, 'tomorrow')}>Move to tomorrow</MenuItem>
            ) : null}
            {task.plannedFor !== null || task.dueOn ? (
              <MenuItem onSelect={() => actions.plan(task.id, 'later')}>Move to later</MenuItem>
            ) : null}
            <MenuSeparator />
            {importance !== 'high' ? (
              <MenuItem onSelect={() => actions.setImportance(task.id, 'high')}>Mark important</MenuItem>
            ) : null}
            {importance !== 'normal' ? (
              <MenuItem onSelect={() => actions.setImportance(task.id, 'normal')}>Normal importance</MenuItem>
            ) : null}
            {importance !== 'low' ? (
              <MenuItem onSelect={() => actions.setImportance(task.id, 'low')}>Less important</MenuItem>
            ) : null}
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
