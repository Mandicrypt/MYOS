import { Link } from 'react-router-dom'
import { blockedForGoal, nextTaskForGoal } from '@/store/selectors'
import { useStore } from '@/store/store'
import type { Goal } from '@/types'

/** A goal and the answer to "why am I doing this, and what's moving it?" */
export function GoalRow({ goal }: { goal: Goal }) {
  const { state, today } = useStore()
  const projects = state.projects.filter((p) => p.goalId === goal.id && p.status !== 'done')
  const next = nextTaskForGoal(state, goal.id, today)
  const blocked = blockedForGoal(state, goal.id)

  return (
    <li className="py-8 first:pt-2">
      <h2 className="text-lg font-medium tracking-[-0.015em]">{goal.title}</h2>
      {goal.why ? <p className="mt-1.5 text-base text-muted">{goal.why}</p> : null}

      <dl className="mt-6 grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
        {projects.length ? (
          <div>
            <dt className="text-sm text-muted">Projects</dt>
            <dd className="mt-1 flex flex-col items-start gap-1">
              {projects.map((p) => (
                <Link key={p.id} to={`/projects/${p.id}`} className="rounded-sm text-base hover:text-accent-ink">
                  {p.title}
                </Link>
              ))}
            </dd>
          </div>
        ) : null}
        <div>
          <dt className="text-sm text-muted">Moving it forward</dt>
          <dd className="mt-1 text-base">
            {next ? (
              <Link to={`/focus/${next.id}`} className="rounded-sm hover:text-accent-ink">
                {next.title}
              </Link>
            ) : (
              <span className="text-muted">Nothing planned yet</span>
            )}
          </dd>
        </div>
        {blocked.length ? (
          <div className="sm:col-span-2">
            <dt className="text-sm text-muted">Held up by</dt>
            {blocked.map((t) => (
              <dd key={t.id} className="mt-1 text-base">
                {t.title}{' '}
                <span className="text-muted">
                  · waiting for {t.waitingOn?.charAt(0).toLowerCase()}
                  {t.waitingOn?.slice(1)}
                </span>
              </dd>
            ))}
          </div>
        ) : null}
      </dl>
    </li>
  )
}
