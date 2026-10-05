import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
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
  const [query, setQuery] = useState('')
  const [showArchived, setShowArchived] = useState(false)

  const notes = useMemo(() => {
    const q = query.trim().toLowerCase()
    return [...state.notes]
      .filter((n) => (showArchived ? n.archivedAt : !n.archivedAt))
      .filter((n) => !q || n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }, [state.notes, query, showArchived])
  const archivedCount = state.notes.filter((n) => n.archivedAt).length

  const create = () => {
    const id = newId()
    dispatch({ type: 'note/add', id })
    navigate(`/notes/${id}`)
  }

  const context = (n: (typeof notes)[number]) =>
    [
      state.goals.find((g) => g.id === n.goalId)?.title,
      state.projects.find((p) => p.id === n.projectId)?.title,
      state.tasks.find((t) => t.id === n.taskId)?.title,
    ].filter(Boolean)

  return (
    <>
      <PageHeader
        title={showArchived ? 'Archived notes' : 'Notes'}
        intro={showArchived ? 'Out of the way, still searchable.' : 'Thinking worth keeping.'}
        action={showArchived ? undefined : <Button onClick={create}>New note</Button>}
      />

      {state.notes.length ? (
        <label className="mb-6 flex items-center gap-3 rounded-xl border border-line bg-surface px-4 transition-colors focus-within:border-accent">
          <Search aria-hidden className="size-4 shrink-0 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes"
            aria-label="Search notes"
            className="h-11 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted"
          />
        </label>
      ) : null}

      {notes.length ? (
        <ul className="divide-y divide-line">
          {notes.map((n) => {
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
                    {[...context(n), timeAgo(n.updatedAt)].join(' · ')}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      ) : query.trim() ? (
        <EmptyState title="No notes match that.">Try a different word.</EmptyState>
      ) : showArchived ? (
        <EmptyState title="Nothing archived." />
      ) : (
        <EmptyState title="Nothing written down yet.">
          <p>Notes are for ideas, research and context you want close to your work.</p>
          <Button variant="primary" className="mt-5" onClick={create}>
            Capture a note
          </Button>
        </EmptyState>
      )}

      {archivedCount || showArchived ? (
        <button
          type="button"
          onClick={() => setShowArchived((s) => !s)}
          className="mt-8 rounded-md text-base text-muted hover:text-ink"
        >
          {showArchived ? 'Back to notes' : `Show ${archivedCount} archived`}
        </button>
      ) : null}
    </>
  )
}
