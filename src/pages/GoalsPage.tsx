import { useState } from 'react'
import { EmptyState } from '@/components/layout/EmptyState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Section } from '@/components/layout/Section'
import { GoalEditor } from '@/components/goals/GoalEditor'
import { GoalList } from '@/components/goals/GoalList'
import { Button } from '@/components/ui/Button'
import { sortGoals } from '@/engine/goals'
import { useStore } from '@/store/store'

export function GoalsPage() {
  const { state, today } = useStore()
  const [creating, setCreating] = useState(false)
  const [showFinished, setShowFinished] = useState(false)
  const goals = sortGoals(state.goals, today)
  const active = goals.filter((g) => g.status === 'active')
  const paused = goals.filter((g) => g.status === 'paused')
  const finished = goals.filter((g) => g.status === 'completed' || g.status === 'archived')

  return (
    <>
      <PageHeader
        title="Goals"
        intro="Why you're doing all of this."
        action={<Button onClick={() => setCreating(true)}>New goal</Button>}
      />

      {active.length ? (
        <GoalList goals={active} />
      ) : (
        <EmptyState title="No active goals.">
          <p>A goal is the bigger outcome your projects and tasks work toward.</p>
          <Button variant="primary" className="mt-5" onClick={() => setCreating(true)}>
            Create your first goal
          </Button>
        </EmptyState>
      )}

      {paused.length ? (
        <Section title="Paused" className="mt-12">
          <GoalList goals={paused} />
        </Section>
      ) : null}

      {finished.length ? (
        <div className="mt-12">
          <button
            type="button"
            onClick={() => setShowFinished((s) => !s)}
            aria-expanded={showFinished}
            className="rounded-md text-base text-muted hover:text-ink"
          >
            {showFinished ? 'Hide' : 'Show'} {finished.length} completed or archived
          </button>
          {showFinished ? (
            <div className="fade mt-2">
              <GoalList goals={finished} />
            </div>
          ) : null}
        </div>
      ) : null}

      <GoalEditor open={creating} onOpenChange={setCreating} />
    </>
  )
}
