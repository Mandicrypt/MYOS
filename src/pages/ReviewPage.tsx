import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/layout/EmptyState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Section } from '@/components/layout/Section'
import { Button } from '@/components/ui/Button'
import { useTaskActions } from '@/components/tasks/useTaskActions'
import { addDays, parseISODate } from '@/lib/dates'
import { selectFocusTask, selectReview } from '@/store/selectors'
import { useStore } from '@/store/store'

/** A supportive look back: what moved, what's stuck, what's next. */
export function ReviewPage() {
  const { state, today } = useStore()
  const { plan } = useTaskActions()
  const review = selectReview(state, today)
  const next = selectFocusTask(state, today)

  const fmt = (d: string) => parseISODate(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
  const range = `${fmt(addDays(today, -6))} – ${fmt(today)}`

  return (
    <>
      <PageHeader title="Weekly review" intro={`The last seven days, ${range}.`} />

      <div className="space-y-14">
        <Section title="What moved forward?">
          {review.moved.length ? (
            <ul className="divide-y divide-line">
              {review.moved.map((m) => (
                <li key={m.label} className="py-4">
                  <div className="flex items-baseline justify-between gap-4">
                    {m.projectId ? (
                      <Link to={`/projects/${m.projectId}`} className="rounded-sm text-md hover:text-accent-ink">
                        {m.label}
                      </Link>
                    ) : (
                      <span className="text-md">{m.label}</span>
                    )}
                    <span className="text-base text-calm-green">{m.level}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted">{m.finished.map((t) => t.title).join(' · ')}</p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="A quiet week.">Rest counts too. Next week starts fresh.</EmptyState>
          )}
        </Section>

        {review.stuck.length ? (
          <Section title="What's stuck?">
            <ul className="divide-y divide-line">
              {review.stuck.map(({ task, reason, suggestion }) => (
                <li key={task.id} className="py-4">
                  <p className="text-md">{task.title}</p>
                  <p className="mt-0.5 text-base text-muted">{reason}</p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface px-4 py-3">
                    <span className="text-base">
                      <span className="text-muted">Suggested next step: </span>
                      {suggestion}
                    </span>
                    <Button onClick={() => plan(task.id, 'tomorrow')}>Plan for tomorrow</Button>
                  </div>
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        {review.quiet.length ? (
          <Section title="Quiet this week">
            <p className="text-base text-muted">
              {review.quiet.map((p) => p.title).join(', ')} didn't move. That's fine if it was a choice — or pick one
              small step for next week.
            </p>
          </Section>
        ) : null}

        {next ? (
          <Section title="Starting point for next week">
            <Link
              to={`/focus/${next.id}`}
              className="block rounded-lg border border-line bg-surface px-5 py-4 transition-colors hover:border-[var(--line-strong)]"
            >
              <span className="block text-md">{next.title}</span>
              <span className="mt-0.5 block text-sm text-muted">Open in Focus</span>
            </Link>
          </Section>
        ) : null}
      </div>
    </>
  )
}
