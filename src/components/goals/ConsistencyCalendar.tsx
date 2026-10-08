import { addDaysTo, weekdayOf } from '@/engine/recurrence'
import { goalDays, seriesOfGoal, type DayState } from '@/engine/routines'
import { cn } from '@/lib/cn'
import { parseISODate } from '@/lib/dates'
import { useStore } from '@/store/store'

const LABEL: Record<DayState, string> = {
  done: 'all done',
  partial: 'some done',
  missed: 'missed',
  skipped: 'skipped',
  open: 'still to do',
  none: 'nothing planned',
}

const WEEKS = 5

/**
 * The last few weeks of an ongoing goal, one dot per day. Quiet colours:
 * a missed day is just an empty ring, never an alarm.
 */
export function ConsistencyCalendar({ goalId }: { goalId: string }) {
  const { state, today } = useStore()
  const thisMonday = addDaysTo(today, -weekdayOf(today))
  // Start at the week the goal's routines began, so a new goal isn't shown a wall of empty past.
  const firstStart = seriesOfGoal(state, goalId)
    .map((s) => s.startsOn)
    .sort()[0]
  const firstMonday = firstStart ? addDaysTo(firstStart, -weekdayOf(firstStart)) : thisMonday
  const earliest = addDaysTo(thisMonday, -7 * (WEEKS - 1))
  const from = firstMonday > earliest ? firstMonday : earliest
  const days = goalDays(state, goalId, from, addDaysTo(thisMonday, 6), today)

  return (
    <div>
      <div className="mb-1.5 grid grid-cols-7 gap-1.5 text-center text-2xs text-faint" aria-hidden>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <ul className="grid grid-cols-7 gap-1.5" aria-label="Recent days">
        {days.map((d) => {
          const future = d.date > today
          const shown: DayState = future ? 'none' : d.state
          const name = parseISODate(d.date).toLocaleDateString(undefined, {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })
          return (
            <li key={d.date} className="flex justify-center">
              <span
                role="img"
                aria-label={`${name}: ${future ? 'not yet' : LABEL[d.state]}`}
                title={`${name}: ${future ? 'not yet' : LABEL[d.state]}`}
                className={cn(
                  'grid size-7 place-items-center rounded-full text-2xs tabular-nums',
                  shown === 'done' && 'bg-calm-green text-on-green',
                  shown === 'partial' && 'bg-calm-green/35 text-ink',
                  shown === 'missed' && 'border border-[var(--control)] text-faint',
                  shown === 'skipped' && 'border border-dashed border-[var(--control)] text-faint',
                  shown === 'open' && 'border-2 border-accent text-ink',
                  shown === 'none' && 'text-faint/60',
                  d.date === today && shown !== 'open' && 'ring-2 ring-accent/60 ring-offset-2 ring-offset-bg',
                )}
              >
                {Number(d.date.slice(8))}
              </span>
            </li>
          )
        })}
      </ul>
      <p className="mt-3 text-sm text-muted">Filled: all done · light: some done · ring: missed · dashed: skipped.</p>
    </div>
  )
}
