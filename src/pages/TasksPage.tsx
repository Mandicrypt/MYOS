import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Section } from '@/components/layout/Section'
import { AddTaskInline } from '@/components/tasks/AddTaskInline'
import { TaskList } from '@/components/tasks/TaskList'
import { addDays } from '@/lib/dates'
import { selectTaskGroups } from '@/store/selectors'
import { useStore } from '@/store/store'

export function TasksPage() {
  const { state, today } = useStore()
  const groups = selectTaskGroups(state, today)
  const [showDone, setShowDone] = useState(false)
  const [showMissed, setShowMissed] = useState(false)

  return (
    <>
      <PageHeader title="Tasks" intro="Everything you've said you'll do, sorted by when." />

      <div className="space-y-12">
        <Section title="Today">
          <TaskList items={groups.today}>
            <li>
              <AddTaskInline defaults={{ plannedFor: today }} />
            </li>
          </TaskList>
        </Section>

        <Section title="Tomorrow">
          <TaskList items={groups.tomorrow}>
            <li>
              <AddTaskInline label="Add for tomorrow" defaults={{ plannedFor: addDays(today, 1) }} />
            </li>
          </TaskList>
        </Section>

        {groups.later.length ? (
          <Section title="Later">
            <TaskList items={groups.later} />
          </Section>
        ) : null}

        {groups.missed.length ? (
          <div>
            <button
              type="button"
              onClick={() => setShowMissed((s) => !s)}
              aria-expanded={showMissed}
              className="rounded-md text-base text-muted hover:text-ink"
            >
              {showMissed ? 'Hide' : 'Show'} {groups.missed.length} missed from routines
            </button>
            {showMissed ? (
              <div className="fade mt-2">
                <TaskList items={groups.missed} />
              </div>
            ) : null}
          </div>
        ) : null}

        {groups.waiting.length ? (
          <Section title="Waiting on something">
            <TaskList items={groups.waiting} />
          </Section>
        ) : null}

        {groups.done.length ? (
          <div>
            <button
              type="button"
              onClick={() => setShowDone((s) => !s)}
              aria-expanded={showDone}
              className="rounded-md text-base text-muted hover:text-ink"
            >
              {showDone ? 'Hide' : 'Show'} {groups.done.length} done this week
            </button>
            {showDone ? (
              <div className="fade mt-2">
                <TaskList items={groups.done} />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </>
  )
}
