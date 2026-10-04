import type { Goal } from '@/types'
import { GoalRow } from './GoalRow'

export function GoalList({ goals }: { goals: Goal[] }) {
  return (
    <ul className="divide-y divide-line">
      {goals.map((g) => (
        <GoalRow key={g.id} goal={g} />
      ))}
    </ul>
  )
}
