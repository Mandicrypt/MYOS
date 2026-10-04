import { useNavigate } from 'react-router-dom'
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from '@/components/ui/Menu'
import { useToast } from '@/components/ui/Toast'
import { timeAgo } from '@/lib/dates'
import { newId } from '@/lib/id'
import { useStore } from '@/store/store'
import type { InboxItem as Item } from '@/types'

/** One captured thought, with ways to turn it into something — whenever you're ready. */
export function InboxItem({ item }: { item: Item }) {
  const { today, dispatch, undo } = useStore()
  const toast = useToast()
  const navigate = useNavigate()

  const convert = (fn: () => void, message: string) => {
    fn()
    dispatch({ type: 'inbox/remove', id: item.id })
    toast.show(message, { label: 'Undo', run: () => (undo(), undo()) })
  }

  return (
    <li className="flex items-center gap-4 py-3.5">
      <div className="min-w-0 flex-1">
        <p className="text-base break-words">{item.text}</p>
        <p className="mt-0.5 text-sm text-muted">{timeAgo(item.createdAt)}</p>
      </div>
      <Menu>
        <MenuTrigger
          className="h-8 shrink-0 rounded-lg px-3 text-base text-muted transition-colors hover:bg-hover hover:text-ink data-[state=open]:bg-hover"
          aria-label={`Sort “${item.text}”`}
        >
          Sort
        </MenuTrigger>
        <MenuContent>
          <MenuItem
            onSelect={() =>
              convert(
                () => dispatch({ type: 'task/add', task: { title: item.text, plannedFor: today } }),
                'Added to today',
              )
            }
          >
            Task for today
          </MenuItem>
          <MenuItem
            onSelect={() =>
              convert(() => dispatch({ type: 'task/add', task: { title: item.text } }), 'Added to tasks for later')
            }
          >
            Task for later
          </MenuItem>
          <MenuItem
            onSelect={() => {
              const id = newId()
              convert(() => dispatch({ type: 'note/add', id, title: item.text }), 'Turned into a note')
              navigate(`/notes/${id}`)
            }}
          >
            Note
          </MenuItem>
          <MenuItem
            onSelect={() => convert(() => dispatch({ type: 'project/add', title: item.text }), 'Added to projects')}
          >
            Project
          </MenuItem>
          <MenuItem onSelect={() => convert(() => dispatch({ type: 'goal/add', title: item.text }), 'Added to goals')}>
            Goal
          </MenuItem>
          <MenuSeparator />
          <MenuItem
            onSelect={() => {
              dispatch({ type: 'inbox/remove', id: item.id })
              toast.show('Let go', { label: 'Undo', run: undo })
            }}
          >
            Let it go
          </MenuItem>
        </MenuContent>
      </Menu>
    </li>
  )
}
