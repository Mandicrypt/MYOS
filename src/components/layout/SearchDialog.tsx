import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUi } from '@/app/ui-context'
import { Modal } from '@/components/ui/Modal'
import { useStore } from '@/store/store'

type Result = { key: string; kind: string; title: string; detail?: string; open: () => void }

const LIMIT_PER_KIND = 5

/** Search across tasks, projects, goals, notes and inbox. Simple text matching, nothing more. */
export function SearchDialog() {
  const { searchOpen, setSearchOpen } = useUi()
  return (
    <Modal open={searchOpen} onOpenChange={setSearchOpen} title="Search" description="Search everything in MYOS">
      {searchOpen ? <SearchBody onDone={() => setSearchOpen(false)} /> : null}
    </Modal>
  )
}

function SearchBody({ onDone }: { onDone: () => void }) {
  const { state } = useStore()
  const { editTask } = useUi()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const has = (...texts: (string | undefined | null)[]) => texts.some((t) => t?.toLowerCase().includes(q))
    const go = (to: string) => () => {
      navigate(to)
      onDone()
    }
    const take = <T,>(items: T[]) => items.slice(0, LIMIT_PER_KIND)
    return [
      ...take(state.tasks.filter((t) => has(t.title, t.description))).map((t) => ({
        key: `t-${t.id}`,
        kind: 'Task',
        title: t.title,
        detail: t.status === 'done' ? 'Done' : state.projects.find((p) => p.id === t.projectId)?.title,
        open: () => {
          onDone()
          editTask(t.id)
        },
      })),
      ...take(state.projects.filter((p) => has(p.title, p.summary))).map((p) => ({
        key: `p-${p.id}`,
        kind: 'Project',
        title: p.title,
        detail: p.summary,
        open: go(`/projects/${p.id}`),
      })),
      ...take(state.goals.filter((g) => has(g.title, g.why))).map((g) => ({
        key: `g-${g.id}`,
        kind: 'Goal',
        title: g.title,
        detail: g.status === 'active' ? undefined : g.status,
        open: go(`/goals/${g.id}`),
      })),
      ...take(state.notes.filter((n) => has(n.title, n.body))).map((n) => ({
        key: `n-${n.id}`,
        kind: 'Note',
        title: n.title || 'Untitled note',
        detail: n.archivedAt
          ? 'Archived'
          : n.body
              .split('\n')
              .find((l) => l.toLowerCase().includes(q))
              ?.trim(),
        open: go(`/notes/${n.id}`),
      })),
      ...take(state.inbox.filter((i) => has(i.text))).map((i) => ({
        key: `i-${i.id}`,
        kind: 'Inbox',
        title: i.text,
        open: go('/inbox'),
      })),
    ]
  }, [query, state, navigate, onDone, editTask])

  return (
    <div>
      <label className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 focus-within:border-accent">
        <Search aria-hidden className="size-4 shrink-0 text-muted" />
        <input
          autoFocus
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && results[0]?.open()}
          placeholder="Search tasks, projects, goals, notes"
          aria-label="Search"
          className="h-12 min-w-0 flex-1 bg-transparent text-md outline-none placeholder:text-muted"
        />
      </label>
      {query.trim() ? (
        results.length ? (
          <ul className="-mx-2 mt-3 max-h-[50vh] overflow-y-auto" aria-label="Results">
            {results.map((r) => (
              <li key={r.key}>
                <button
                  type="button"
                  onClick={r.open}
                  className="flex w-full items-baseline gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-hover"
                >
                  <span className="w-14 shrink-0 text-sm text-muted">{r.kind}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base">{r.title}</span>
                    {r.detail ? <span className="block truncate text-sm text-muted">{r.detail}</span> : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-base text-muted">Nothing matches “{query.trim()}”.</p>
        )
      ) : (
        <p className="mt-4 text-sm text-muted">Tip: press / anywhere to search.</p>
      )}
    </div>
  )
}
