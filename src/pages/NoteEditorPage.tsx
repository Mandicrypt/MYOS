import { Ellipsis } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { BackLink } from '@/components/layout/BackLink'
import { EmptyState } from '@/components/layout/EmptyState'
import { Menu, MenuContent, MenuItem, MenuTrigger } from '@/components/ui/Menu'
import { useToast } from '@/components/ui/Toast'
import { timeAgo } from '@/lib/dates'
import { useStore } from '@/store/store'

/** A plain page to write on. Saves as you type. */
export function NoteEditorPage() {
  const { noteId } = useParams()
  const { state, dispatch, undo } = useStore()
  const toast = useToast()
  const navigate = useNavigate()
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const note = state.notes.find((n) => n.id === noteId)

  useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [note?.body])

  if (!note) {
    return (
      <>
        <BackLink to="/notes" label="Notes" />
        <EmptyState title="This note isn't here anymore." />
      </>
    )
  }

  return (
    <>
      <div className="flex items-start justify-between">
        <BackLink to="/notes" label="Notes" />
        <Menu>
          <MenuTrigger
            aria-label="Note actions"
            className="-mt-1 grid size-9 place-items-center rounded-lg text-muted hover:bg-hover hover:text-ink"
          >
            <Ellipsis className="size-4" />
          </MenuTrigger>
          <MenuContent>
            <MenuItem
              onSelect={() => {
                dispatch({ type: 'note/archive', id: note.id, archived: !note.archivedAt })
                toast.show(note.archivedAt ? 'Note restored' : 'Note archived', { label: 'Undo', run: undo })
              }}
            >
              {note.archivedAt ? 'Restore from archive' : 'Archive note'}
            </MenuItem>
            <MenuItem
              danger
              onSelect={() => {
                dispatch({ type: 'note/delete', id: note.id })
                navigate('/notes')
                toast.show('Note deleted', { label: 'Undo', run: undo })
              }}
            >
              Delete note
            </MenuItem>
          </MenuContent>
        </Menu>
      </div>

      {note.archivedAt ? (
        <p className="mb-4 text-sm text-muted">This note is archived. It stays searchable in Notes.</p>
      ) : null}
      <input
        value={note.title}
        onChange={(e) => dispatch({ type: 'note/update', id: note.id, patch: { title: e.target.value } })}
        placeholder="Title"
        aria-label="Note title"
        autoFocus={!note.title}
        className="w-full bg-transparent text-xl font-medium tracking-[-0.02em] outline-none placeholder:text-faint"
      />
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
        <LinkSelect
          label="Goal"
          value={note.goalId}
          options={state.goals
            .filter((g) => g.status !== 'archived' || g.id === note.goalId)
            .map((g) => ({ id: g.id, title: g.title }))}
          onChange={(goalId) => dispatch({ type: 'note/update', id: note.id, patch: { goalId } })}
        />
        <LinkSelect
          label="Project"
          value={note.projectId}
          options={state.projects.map((p) => ({ id: p.id, title: p.title }))}
          onChange={(projectId) => dispatch({ type: 'note/update', id: note.id, patch: { projectId } })}
        />
        <LinkSelect
          label="Task"
          value={note.taskId}
          options={state.tasks
            .filter((t) => t.status === 'open' || t.id === note.taskId)
            .map((t) => ({ id: t.id, title: t.title }))}
          onChange={(taskId) => dispatch({ type: 'note/update', id: note.id, patch: { taskId } })}
        />
        <span>Edited {timeAgo(note.updatedAt)}</span>
      </div>
      <textarea
        ref={bodyRef}
        value={note.body}
        onChange={(e) => dispatch({ type: 'note/update', id: note.id, patch: { body: e.target.value } })}
        placeholder="Start writing…"
        aria-label="Note"
        className="mt-8 min-h-[50vh] w-full resize-none bg-transparent text-md leading-[1.75] outline-none placeholder:text-faint"
      />
    </>
  )
}

/** A quiet inline picker for linking a note to one goal, project or task. */
function LinkSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string | null
  options: { id: string; title: string }[]
  onChange: (id: string | null) => void
}) {
  return (
    <label className="flex items-center gap-1.5">
      <span>{label}</span>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        className="max-w-48 rounded-md bg-transparent py-0.5 text-ink outline-none hover:bg-hover"
      >
        <option value="">None</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.title}
          </option>
        ))}
      </select>
    </label>
  )
}
