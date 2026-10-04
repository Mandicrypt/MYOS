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

      <input
        value={note.title}
        onChange={(e) => dispatch({ type: 'note/update', id: note.id, patch: { title: e.target.value } })}
        placeholder="Title"
        aria-label="Note title"
        autoFocus={!note.title}
        className="w-full bg-transparent text-xl font-medium tracking-[-0.02em] outline-none placeholder:text-faint"
      />
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
        <label className="flex items-center gap-1.5">
          <span>Project</span>
          <select
            value={note.projectId ?? ''}
            onChange={(e) =>
              dispatch({ type: 'note/update', id: note.id, patch: { projectId: e.target.value || null } })
            }
            className="rounded-md bg-transparent py-0.5 text-ink outline-none hover:bg-hover"
          >
            <option value="">None</option>
            {state.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </label>
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
