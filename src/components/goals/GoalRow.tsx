import { Link } from 'react-router-dom'
import { goalProgress, projectsForGoal } from '@/engine/goals'
import { ProgressLine } from '@/components/ui/ProgressLine'
import { nextTaskForGoal } from '@/store/selectors'
import { useStore } from '@/store/store'
import type { Goal } from '@/types'
import { targetLabel } from './goal-labels'

/** One goal in the list: what it is, how far along, and what's moving it. */
export function GoalRow({ goal }: { goal: Goal }) {
  const { state, today } = useStore()
  const progress = goalProgress(state, goal.id)
  const projects = projectsForGoal(state, goal.id).filter((p) => p.status !== 'done')
  const next = goal.status === 'active' ? nextTaskForGoal(state, goal.id, today) : null
  const meta = [
    goal.importance === 'high' ? 'Important' : null,
    targetLabel(goal, today),
    projects.length ? `${projects.length} project${projects.length === 1 ? '' : 's'}` : null,
  ].filter(Boolean)

  return (
    <li>
      <Link
        to={`/goals/${goal.id}`}
        className="block rounded-lg py-6 transition-colors hover:bg-hover md:-mx-3 md:px-3"
      >
        <span className="block text-lg font-medium tracking-[-0.015em]">{goal.title}</span>
        {meta.length ? <span className="mt-1 block text-sm text-muted">{meta.join(' · ')}</span> : null}
        {progress.total ? (
          <span className="mt-4 flex items-center gap-3">
            <ProgressLine percent={progress.percent ?? 0} className="max-w-48" />
            <span className="text-sm whitespace-nowrap text-muted tabular-nums">
              {progress.done} of {progress.total} {progress.total === 1 ? 'task' : 'tasks'} done
            </span>
          </span>
        ) : (
          <span className="mt-3 block text-sm text-muted">No linked work yet</span>
        )}
        {next ? <span className="mt-2 block text-sm text-muted">Next: {next.title}</span> : null}
      </Link>
    </li>
  )
}
