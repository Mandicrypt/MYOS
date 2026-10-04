import { ArrowLeft, Check, ExternalLink } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { FocusTimer } from '@/components/focus/FocusTimer'
import { Button, buttonClass } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { tasksUnblockedBy, useTaskActions } from '@/components/tasks/useTaskActions'
import { engine } from '@/engine/importance'
import { scoreCompletion } from '@/engine/meaningful-work'
import { suggestNext } from '@/engine/next'
import { goalFor, projectFor, selectFocusTask, waitingReason } from '@/store/selectors'
import { useStore } from '@/store/store'
import type { Task } from '@/types'

/** A full-screen space for one task. No sidebar, nothing unrelated. */
export function FocusPage() {
  const { taskId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { state, today, dispatch } = useStore()
  const { skip } = useTaskActions('focus')
  const [completion, setFinished] = useState<{
    forRoute: string | undefined
    task: Task
    points: number
    unblocked: Task[]
  } | null>(null)
  // Only show the completion screen for the task it belongs to.
  const finished = completion && completion.forRoute === taskId ? completion : null

  const task = taskId ? state.tasks.find((t) => t.id === taskId) : selectFocusTask(state, today)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [taskId])

  // Return to wherever Focus was opened from; go home if it was opened directly.
  const back = () => (location.key === 'default' ? navigate('/') : navigate(-1))
  const goHome = () => navigate('/')

  if (finished) {
    // Not "the next task in the list": what makes the most sense now that this is done.
    const next = suggestNext(
      state,
      today,
      finished.task,
      finished.unblocked.map((t) => t.id),
    )
    return (
      <FocusFrame onBack={goHome}>
        <div className="appear py-16 text-center md:py-24">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-calm-green text-on-green">
            <Check className="size-6" strokeWidth={2.5} />
          </span>
          <h1 className="mt-6 text-xl font-medium tracking-[-0.02em]">Completed</h1>
          <p className="mt-1.5 text-md text-muted">{finished.task.title}</p>
          {state.settings.showMeaningfulWork ? (
            <p className="mt-4 text-base text-calm-green">+{finished.points} meaningful work</p>
          ) : null}
          {finished.unblocked.length ? (
            <p className="mt-2 text-base text-muted">
              Now unblocked: {finished.unblocked.map((t) => t.title).join(', ')}
            </p>
          ) : null}

          {next ? (
            <div className="mx-auto mt-14 max-w-sm border-t border-line pt-8 text-left">
              <p className="text-base text-muted">What makes sense now</p>
              <p className="mt-1 text-md">{next.ranked.task.title}</p>
              {next.note || next.ranked.reasons.length ? (
                <p className="mt-1 text-base text-muted">{next.note ?? next.ranked.reasons.join(' · ')}</p>
              ) : null}
              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="primary"
                  onClick={() => navigate(`/focus/${next.ranked.task.id}`, { replace: true })}
                  className="sm:flex-1"
                >
                  Start next
                </Button>
                <Button variant="secondary" onClick={goHome} className="sm:flex-1">
                  Back home
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-12">
              <p className="text-base text-muted">That's everything for today.</p>
              <Button variant="secondary" onClick={goHome} className="mt-5">
                Back home
              </Button>
            </div>
          )}
        </div>
      </FocusFrame>
    )
  }

  if (!task || task.status === 'done') {
    return (
      <FocusFrame onBack={goHome}>
        <div className="py-24 text-center">
          <p className="text-lg font-medium">{task ? 'This one is already done.' : "You're clear."}</p>
          <p className="mt-1.5 text-base text-muted">{task ? 'Nice work.' : 'Nothing needs your focus right now.'}</p>
          <Link to="/" className={buttonClass('secondary', 'md', 'mt-6')}>
            Back home
          </Link>
        </div>
      </FocusFrame>
    )
  }

  const project = projectFor(state, task)
  const goal = goalFor(state, task)
  const waiting = waitingReason(state, task)
  const ranked = engine.rank([task], { state, today })[0]
  const reasons = ranked?.reasons ?? []
  // Plain sentences for "Why it matters", strongest first.
  const why = (ranked?.why ?? []).filter((r) => r.long && r.weight > 0).slice(0, 3)
  const notes = state.notes.filter((n) => task.noteIds.includes(n.id))
  const context = [project?.title, goal?.title].filter(Boolean).join(' · ')

  const complete = () => {
    const { points } = scoreCompletion(task, state)
    const unblocked = tasksUnblockedBy(state.tasks, task)
    const wasSuggested = selectFocusTask(state, today)?.id === task.id
    dispatch({ type: 'task/complete', id: task.id, source: 'focus', wasSuggested })
    setFinished({ forRoute: taskId, task, points, unblocked })
  }

  return (
    <FocusFrame onBack={back} right={<FocusTimer />}>
      <article className="pt-6 pb-40 md:pt-12">
        {context ? <p className="text-base text-muted">{context}</p> : null}
        <h1 className="mt-1.5 text-2xl font-medium tracking-[-0.025em] text-balance">{task.title}</h1>
        {reasons.length ? <p className="mt-3 text-md text-muted">{reasons.join(' · ')}</p> : null}

        {waiting ? (
          <p className="mt-6 rounded-lg bg-accent-soft px-4 py-3 text-base text-accent-ink">
            {waiting}. You can still work on it.
          </p>
        ) : null}

        <div className="mt-10 space-y-10 border-t border-line pt-10">
          {why.length ? (
            <section aria-labelledby="why-title">
              <h2 id="why-title" className="text-base font-medium text-muted">
                Why it matters
              </h2>
              <ul className="mt-2 space-y-1 text-md">
                {why.map((r) => (
                  <li key={r.key}>{r.long}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {task.description ? <p className="text-md leading-relaxed text-ink/90">{task.description}</p> : null}

          {task.checklist.length ? (
            <section aria-label="Steps">
              <ul className="space-y-1">
                {task.checklist.map((item) => (
                  <li key={item.id} className="flex items-start gap-3.5 py-2">
                    <span className="pt-0.5">
                      <Checkbox
                        size="sm"
                        checked={item.done}
                        onChange={() => dispatch({ type: 'task/checklist', id: task.id, itemId: item.id })}
                        label={item.text}
                      />
                    </span>
                    <span className={item.done ? 'text-muted line-through decoration-[var(--control)]' : ''}>
                      {item.text}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {notes.length || task.links.length ? (
            <section aria-label="Useful references" className="space-y-2">
              {notes.map((n) => (
                <Link
                  key={n.id}
                  to={`/notes/${n.id}`}
                  className="block rounded-lg border border-line bg-surface px-4 py-3 transition-colors hover:border-[var(--line-strong)]"
                >
                  <span className="block text-base">{n.title}</span>
                  <span className="mt-0.5 line-clamp-1 block text-sm text-muted">{n.body.split('\n')[0]}</span>
                </Link>
              ))}
              {task.links.map((l) => (
                <a
                  key={l.url}
                  href={l.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-lg border border-line bg-surface px-4 py-3 text-base transition-colors hover:border-[var(--line-strong)]"
                >
                  {l.label}
                  <ExternalLink className="size-4 text-muted" />
                </a>
              ))}
            </section>
          ) : null}

          {task.outcome ? (
            <p className="text-base text-muted">
              When this is done: {task.outcome.charAt(0).toLowerCase() + task.outcome.slice(1)}.
            </p>
          ) : null}
        </div>
      </article>

      <div className="fixed inset-x-0 bottom-0 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex max-w-[620px] flex-col-reverse gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <Button
            variant="quiet"
            onClick={() => {
              skip(task.id, 'tomorrow')
              goHome()
            }}
          >
            Not now — do it tomorrow
          </Button>
          <Button variant="primary" size="lg" onClick={complete} className="max-sm:w-full">
            Complete
          </Button>
        </div>
      </div>
    </FocusFrame>
  )
}

function FocusFrame({
  children,
  onBack,
  right,
}: {
  children: React.ReactNode
  onBack: () => void
  right?: React.ReactNode
}) {
  return (
    <div className="min-h-dvh bg-bg">
      <div className="mx-auto max-w-[620px] px-5 pt-[calc(1rem+env(safe-area-inset-top))] sm:px-8 md:pt-8">
        <div className="flex items-center justify-between">
          <button type="button" onClick={onBack} className={buttonClass('quiet', 'md', '-ml-3')}>
            <ArrowLeft className="size-4" /> Back
          </button>
          {right}
        </div>
        <main>{children}</main>
      </div>
    </div>
  )
}
