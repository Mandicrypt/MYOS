import { Link } from 'react-router-dom'
import { describeRule, nextOccurrence } from '@/engine/recurrence'
import { goalConsistency, seriesOfGoal } from '@/engine/routines'
import { TaskRow } from '@/components/tasks/TaskRow'
import { friendlyDay, parseISODate } from '@/lib/dates'
import { useStore } from '@/store/store'
import { ConsistencyCalendar } from './ConsistencyCalendar'

const stat = 'text-xl font-medium tabular-nums'
const statLabel = 'text-sm text-muted'

/** The numbers for an ongoing goal. Only things that can be worked out from real days. */
export function RoutineSummary({ goalId }: { goalId: string }) {
  const { state, today } = useStore()
  const c = goalConsistency(state, goalId, today)
  const last = c.lastCompleted ? friendlyDay(c.lastCompleted, today) : null

  if (!seriesOfGoal(state, goalId).length)
    return (
      <p className="text-base text-muted">
        Nothing repeats yet. Add a recurring task below, then your consistency shows up here: today, this week and your
        streak.
      </p>
    )

  return (
    <div className="space-y-8">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-4">
        <div>
          <dt className={statLabel}>Today</dt>
          <dd className={stat}>{c.today.total ? `${c.today.done} / ${c.today.total}` : '—'}</dd>
          {!c.today.total ? <dd className="text-sm text-muted">Nothing due</dd> : null}
        </div>
        <div>
          <dt className={statLabel}>This week</dt>
          <dd className={stat}>{c.week.of ? `${c.week.complete} / ${c.week.of}` : '—'}</dd>
          {c.week.of ? <dd className="text-sm text-muted">days</dd> : null}
        </div>
        <div>
          <dt className={statLabel}>Current streak</dt>
          <dd className={stat}>{c.streak}</dd>
          <dd className="text-sm text-muted">{c.streak === 1 ? 'day' : 'days'}</dd>
        </div>
        <div>
          <dt className={statLabel}>Last completed</dt>
          <dd className={`${stat} capitalize`}>{last ?? '—'}</dd>
        </div>
      </dl>
      <ConsistencyCalendar goalId={goalId} />
    </div>
  )
}

/** The goal's recurring tasks, each with today's occurrence ready to tick. */
export function RoutineList({ goalId }: { goalId: string }) {
  const { state, today } = useStore()
  const series = seriesOfGoal(state, goalId).sort(
    (a, b) => Number(b.active) - Number(a.active) || a.title.localeCompare(b.title),
  )
  if (!series.length) return null
  return (
    <ul className="divide-y divide-line">
      {series.map((s) => {
        const todays = state.tasks.find((t) => t.recurrenceId === s.id && t.occurrenceDate === today)
        if (todays && s.active) return <TaskRow key={s.id} task={todays} hideProject />
        const next = s.active ? nextOccurrence(s, today) : null
        return (
          <li key={s.id} className="py-3">
            <Link to="/tasks" className="block rounded-md text-base hover:text-accent-ink">
              {s.title}
            </Link>
            <span className="mt-0.5 block text-sm text-muted">
              {[
                describeRule(s),
                s.active
                  ? next
                    ? `Next ${parseISODate(next).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}`
                    : 'Finished'
                  : 'Stopped',
              ].join(' · ')}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
