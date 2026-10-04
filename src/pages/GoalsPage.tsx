import { useUi } from '@/app/ui-context'
import { EmptyState } from '@/components/layout/EmptyState'
import { PageHeader } from '@/components/layout/PageHeader'
import { GoalList } from '@/components/goals/GoalList'
import { Button } from '@/components/ui/Button'
import { useStore } from '@/store/store'

export function GoalsPage() {
  const { state } = useStore()
  const { openQuickAdd } = useUi()
  const active = state.goals.filter((g) => g.status === 'active')
  return (
    <>
      <PageHeader
        title="Goals"
        intro="Why you're doing all of this."
        action={<Button onClick={() => openQuickAdd('goal')}>New goal</Button>}
      />
      {active.length ? (
        <GoalList goals={active} />
      ) : (
        <EmptyState title="No goals yet.">Add one when you know what you're working toward.</EmptyState>
      )}
    </>
  )
}
