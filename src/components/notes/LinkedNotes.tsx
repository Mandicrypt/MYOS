import { Plus } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Section } from '@/components/layout/Section'
import { newId } from '@/lib/id'
import { useStore } from '@/store/store'
import type { ID, Note } from '@/types'

type Target = { projectId?: ID; goalId?: ID; taskId?: ID }

/** Notes linked to a project, goal or task, with a quick way to add one. */
export function LinkedNotes({ notes, link, title = 'Notes' }: { notes: Note[]; link: Target; title?: string }) {
  const { dispatch } = useStore()
  const navigate = useNavigate()
  const visible = notes.filter((n) => !n.archivedAt)

  const create = () => {
    const id = newId()
    dispatch({ type: 'note/add', id, ...link })
    navigate(`/notes/${id}`)
  }

  return (
    <Section title={title}>
      <ul className="divide-y divide-line">
        {visible.map((n) => (
          <li key={n.id}>
            <Link to={`/notes/${n.id}`} className="block rounded-md py-3 hover:text-accent-ink">
              <span className="block text-base">{n.title || 'Untitled note'}</span>
              {n.body.trim() ? (
                <span className="mt-0.5 line-clamp-1 block text-sm text-muted">
                  {n.body.split('\n').find((l) => l.trim())}
                </span>
              ) : null}
            </Link>
          </li>
        ))}
        <li>
          <button
            type="button"
            onClick={create}
            className="flex w-full items-center gap-3.5 rounded-lg py-3 text-left text-base text-muted transition-colors hover:text-ink"
          >
            <span className="grid size-[22px] place-items-center">
              <Plus className="size-4" />
            </span>
            Add a note
          </button>
        </li>
      </ul>
    </Section>
  )
}
