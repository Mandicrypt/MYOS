import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useUi } from '@/app/ui-context'
import { EmptyState } from '@/components/layout/EmptyState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Section } from '@/components/layout/Section'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { addDays, parseISODate } from '@/lib/dates'
import { selectWeekReview, weekStartOf } from '@/store/review'
import { useStore } from '@/store/store'

const fmt = (d: string) => parseISODate(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })

/** What happened this week, what's falling behind, and what to focus on next. */
export function ReviewPage() {
  const { state, today, dispatch } = useStore()
  const { editTask } = useUi()
  const toast = useToast()
  const currentWeek = weekStartOf(today)
  const [start, setStart] = useState(currentWeek)
  const week = selectWeekReview(state, start, today)
  const s = week.summary
  const nothingYet =
    !s.completed && !s.created && !week.goals.length && !week.attention.length && !week.recommendations.length

  const decide = (taskId: string, accepted: boolean) => {
    dispatch({
      type: 'recommendation/decide',
      id: taskId,
      accepted,
      plannedFor: accepted ? week.nextWeekStart : undefined,
      source: 'review',
      wasSuggested: true,
    })
    toast.show(
      accepted
        ? `Planned for ${parseISODate(week.nextWeekStart).toLocaleDateString(undefined, { weekday: 'long' })}`
        : 'Okay, not this time',
    )
  }

  const metrics = [
    { label: 'Tasks completed', value: s.completed },
    { label: 'Tasks added', value: s.created },
    ...(s.overdue !== null ? [{ label: 'Overdue now', value: s.overdue }] : []),
    { label: 'Projects worked on', value: s.projectsWorked },
    { label: 'Goals moved', value: s.goalsMoved },
  ]

  return (
    <>
      <PageHeader
        title="Weekly review"
        intro={`${week.isCurrent ? 'This week' : 'Week of'} ${fmt(week.start)} – ${fmt(week.end)}.`}
      />

      <div className="-mt-6 mb-10 flex items-center gap-1">
        <Button variant="quiet" onClick={() => setStart(addDays(start, -7))} aria-label="Previous week">
          <ChevronLeft className="size-4" /> Earlier
        </Button>
        {!week.isCurrent ? (
          <>
            <Button variant="quiet" onClick={() => setStart(addDays(start, 7))} aria-label="Next week">
              Later <ChevronRight className="size-4" />
            </Button>
            <Button variant="quiet" onClick={() => setStart(currentWeek)}>
              This week
            </Button>
          </>
        ) : null}
      </div>

      {nothingYet ? (
        <EmptyState title={week.isCurrent ? 'Nothing to review yet.' : 'A quiet week.'}>
          {week.isCurrent
            ? 'As you add and finish work, this page shows what moved, what needs attention, and what to do next.'
            : 'Rest counts too.'}
        </EmptyState>
      ) : (
        <div className="space-y-14">
          <section aria-label="Week summary">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-5">
              {metrics.map((m) => (
                <div key={m.label} className="flex flex-col justify-between">
                  <dt className="text-sm text-muted">{m.label}</dt>
                  <dd className="mt-0.5 text-xl font-medium tabular-nums">{m.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <Section title="Completed work">
            {week.completed.length ? (
              <ul className="divide-y divide-line">
                {week.completed.map((g) => (
                  <li key={g.projectId ?? 'none'} className="py-4">
                    {g.projectId ? (
                      <Link to={`/projects/${g.projectId}`} className="rounded-sm text-md hover:text-accent-ink">
                        {g.label}
                      </Link>
                    ) : (
                      <span className="text-md">{g.label}</span>
                    )}
                    <ul className="mt-1.5 space-y-1">
                      {g.items.map((item) => (
                        <li key={item.taskId} className="text-base text-muted">
                          {item.exists ? (
                            <button
                              type="button"
                              onClick={() => editTask(item.taskId)}
                              className="rounded-sm text-left hover:text-ink"
                            >
                              {item.title}
                            </button>
                          ) : (
                            item.title
                          )}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-2 text-base text-muted">
                Nothing finished {week.isCurrent ? 'yet this week' : 'that week'}.
              </p>
            )}
          </Section>

          {week.isCurrent && week.attention.length ? (
            <Section title="Needs attention">
              <ul className="divide-y divide-line">
                {week.attention.slice(0, 6).map((a) => (
                  <li key={a.key} className="flex items-center justify-between gap-4 py-3.5">
                    <div className="min-w-0">
                      <p className="text-base">{a.title}</p>
                      <p className="mt-0.5 text-sm text-muted">{a.reason}</p>
                    </div>
                    {a.taskId ? (
                      <Button onClick={() => editTask(a.taskId!)}>Open</Button>
                    ) : (
                      <Link
                        to={a.to}
                        className="shrink-0 rounded-lg border border-line bg-surface px-3.5 py-1.5 text-base hover:border-[var(--line-strong)]"
                      >
                        Open
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {week.goals.length ? (
            <Section title="Goal progress">
              <ul className="divide-y divide-line">
                {week.goals.map((g) => (
                  <li key={g.goal.id} className="py-4">
                    <div className="flex items-baseline justify-between gap-4">
                      <Link to={`/goals/${g.goal.id}`} className="min-w-0 rounded-sm text-md hover:text-accent-ink">
                        {g.goal.title}
                      </Link>
                      <span
                        className={
                          g.change > 0
                            ? 'text-base whitespace-nowrap text-calm-green'
                            : 'text-base whitespace-nowrap text-muted'
                        }
                      >
                        {g.change > 0 ? `↑ ${g.change}%` : 'No change'}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      {g.tasksCompleted} task{g.tasksCompleted === 1 ? '' : 's'} completed · {g.projectsWorked} project
                      {g.projectsWorked === 1 ? '' : 's'} worked on
                    </p>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {week.isCurrent ? (
            <Section title="Next week">
              <p className="-mt-1 mb-3 text-sm text-muted">
                MYOS recommends. You decide. Nothing changes unless you accept.
              </p>
              {week.recommendations.length ? (
                <ul className="divide-y divide-line">
                  {week.recommendations.map(({ ranked, decision }) => (
                    <li key={ranked.task.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => editTask(ranked.task.id)}
                          className="rounded-sm text-left text-md hover:text-accent-ink"
                        >
                          {ranked.task.title}
                        </button>
                        {decision === 'accepted' ? (
                          <p className="mt-0.5 text-sm text-calm-green">Planned for {fmt(week.nextWeekStart)}</p>
                        ) : ranked.reasons.length ? (
                          <p className="mt-0.5 text-sm text-muted">{ranked.reasons.join(' · ')}</p>
                        ) : null}
                      </div>
                      {decision === null ? (
                        <div className="flex gap-2">
                          <Button variant="quiet" onClick={() => decide(ranked.task.id, false)}>
                            Not now
                          </Button>
                          <Button onClick={() => decide(ranked.task.id, true)}>Accept</Button>
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-2 text-base text-muted">
                  Nothing else to line up. Today’s list already covers what matters.
                </p>
              )}
            </Section>
          ) : null}
        </div>
      )}
    </>
  )
}
