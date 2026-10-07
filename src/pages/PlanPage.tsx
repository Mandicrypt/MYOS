import { Link, useNavigate } from 'react-router-dom'
import { BackLink } from '@/components/layout/BackLink'
import { EmptyState } from '@/components/layout/EmptyState'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { useTaskActions } from '@/components/tasks/useTaskActions'
import { planDay } from '@/engine/daily-plan'
import { formatMinutes } from '@/lib/dates'
import { cn } from '@/lib/cn'
import { useStore } from '@/store/store'

/**
 * Today's plan: a few high-value tasks that fit the time you have, each with
 * the reason MYOS picked it. You accept, turn down, postpone or complete each one.
 */
export function PlanPage() {
  const { state, today, dispatch } = useStore()
  const navigate = useNavigate()
  const { complete, reopen, skip } = useTaskActions('home')
  const plan = planDay(state, today)
  const decide = (id: string, accepted: boolean) =>
    dispatch({ type: 'plan/decide', id, accepted, today, source: 'home', wasSuggested: true })
  const accepted = plan.items.filter((i) => i.status !== 'suggested')

  return (
    <>
      <BackLink to="/" label="Home" />
      <header className="mb-10">
        <h1 className="text-xl font-medium tracking-[-0.02em]">Today’s plan</h1>
        <p className="mt-1.5 text-md text-muted">
          A few things worth your time today, fitted to about {formatMinutes(plan.capacityMinutes)}.{' '}
          <Link to="/settings" className="rounded-sm underline decoration-line underline-offset-4 hover:text-ink">
            Change
          </Link>
        </p>
        {plan.overloaded ? (
          <p className="mt-3 rounded-lg bg-accent-soft px-3 py-2.5 text-base text-accent-ink">
            More is planned for today than fits. Consider moving something to tomorrow.
          </p>
        ) : null}
      </header>

      {plan.items.length ? (
        <ul className="divide-y divide-line">
          {plan.items.map((item) => (
            <li key={item.task.id} className="flex items-start gap-3.5 py-4">
              <span className="pt-0.5">
                <Checkbox
                  checked={item.status === 'done'}
                  onChange={() => (item.status === 'done' ? reopen(item.task.id) : complete(item.task.id))}
                  label={
                    item.status === 'done' ? `Mark “${item.task.title}” as not done` : `Complete “${item.task.title}”`
                  }
                />
              </span>
              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => navigate(`/focus/${item.task.id}`)}
                  className={cn(
                    'rounded-sm text-left text-md hover:text-accent-ink',
                    item.status === 'done' && 'text-muted line-through',
                  )}
                >
                  {item.task.title}
                </button>
                <p className="mt-0.5 text-sm text-muted">
                  {item.status === 'suggested' ? item.reason : item.status === 'done' ? 'Done' : 'In your plan'} ·{' '}
                  {formatMinutes(item.minutes)}
                </p>
                {item.status === 'suggested' ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button onClick={() => decide(item.task.id, true)}>Accept</Button>
                    <Button variant="quiet" onClick={() => skip(item.task.id, 'tomorrow')}>
                      Tomorrow
                    </Button>
                    <Button variant="quiet" onClick={() => decide(item.task.id, false)}>
                      Not today
                    </Button>
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="Nothing to plan.">Add a few tasks and MYOS will suggest how to spend your day.</EmptyState>
      )}

      {accepted.length ? (
        <p className="mt-8 text-base text-muted" role="status">
          {plan.complete
            ? 'Plan complete. Nice work.'
            : `${accepted.filter((i) => i.status === 'done').length} of ${accepted.length} planned tasks done.`}
        </p>
      ) : null}
    </>
  )
}
