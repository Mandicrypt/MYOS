import { Link, useNavigate } from 'react-router-dom'
import { Section } from '@/components/layout/Section'
import { AddTaskInline } from '@/components/tasks/AddTaskInline'
import { TaskList } from '@/components/tasks/TaskList'
import { FocusCard } from '@/components/focus/FocusCard'
import { greeting } from '@/lib/dates'
import { selectHome } from '@/store/selectors'
import { useStore } from '@/store/store'

/** Home answers one question: what matters now? */
export function HomePage() {
  const { state, today } = useStore()
  const navigate = useNavigate()
  const { focus, today: rest, moreToday } = selectHome(state, today)
  const name = state.settings.name.trim()

  return (
    <>
      <header className="mb-12 md:mb-14">
        <h1 className="text-xl font-medium tracking-[-0.02em]">
          {greeting()}
          {name ? `, ${name}` : ''}.
        </h1>
        <p className="mt-1.5 text-md text-muted">
          {focus ? "Here's what matters today." : 'Nothing is asking for your attention today.'}
        </p>
      </header>

      {focus ? (
        <FocusCard ranked={focus} onStart={() => navigate(`/focus/${focus.task.id}`)} />
      ) : (
        <div className="border-y border-line py-12">
          <p className="text-lg font-medium tracking-[-0.01em]">You're clear.</p>
          <p className="mt-1.5 text-base text-muted">Add something below, or pick from what's coming up in Tasks.</p>
        </div>
      )}

      <Section title="Today" className="mt-12">
        <TaskList items={rest}>
          <li>
            <AddTaskInline defaults={{ plannedFor: today }} />
          </li>
        </TaskList>
        {moreToday ? (
          <Link to="/tasks" className="mt-1 inline-block rounded-md text-base text-muted hover:text-ink">
            {moreToday} more for today
          </Link>
        ) : null}
      </Section>

      {state.inbox.length ? (
        <p className="mt-16 text-base text-muted">
          <Link
            to="/inbox"
            className="rounded-md underline decoration-line underline-offset-4 hover:text-ink hover:decoration-[var(--control)]"
          >
            {state.inbox.length === 1 ? '1 thought' : `${state.inbox.length} thoughts`} waiting in your inbox
          </Link>
        </p>
      ) : null}
    </>
  )
}
