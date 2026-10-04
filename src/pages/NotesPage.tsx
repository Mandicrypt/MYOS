import { Link, useNavigate } from 'react-router-dom'
import { EmptyState } from '@/components/layout/EmptyState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { timeAgo } from '@/lib/dates'
import { newId } from '@/lib/id'
import { useStore } from '@/store/store'

export function NotesPage() {
  const { state, dispatch } = useStore()
  const navigate = useNavigate()
  const notes = [...state.notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

  const create = () => {
    const id = newId()
    dispatch({ type: 'note/add', id })
    navigate(`/notes/${id}`)
  }

  return (
    <>
      <PageHeader title="Notes" intro="Thinking worth keeping." action={<Button onClick={create}>New note</Button>} />
      {notes.length ? (
        <ul className="divide-y divide-line">
          {notes.map((n) => {
            const project = state.projects.find((p) => p.id === n.projectId)
            const firstLine = n.body.split('\n').find((l) => l.trim())
            return (
              <li key={n.id}>
                <Link
                  to={`/notes/${n.id}`}
                  className="block rounded-lg py-5 transition-colors hover:bg-hover md:-mx-3 md:px-3"
                >
                  <span className="block text-md">{n.title || 'Untitled note'}</span>
                  {firstLine ? (
                    <span className="mt-0.5 line-clamp-1 block text-base text-muted">{firstLine}</span>
                  ) : null}
                  <span className="mt-2 block text-sm text-muted">
                    {[project?.title, timeAgo(n.updatedAt)].filter(Boolean).join(' · ')}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      ) : (
        <EmptyState title="Nothing written down yet.">
          Notes are for ideas, research and anything you want to keep close.
        </EmptyState>
      )}
    </>
  )
}
