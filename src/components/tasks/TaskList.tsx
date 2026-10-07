import type { ReactNode } from 'react'
import type { RankedTask } from '@/engine/types'
import type { Task } from '@/types'
import { TaskRow } from './TaskRow'

type Item = Task | RankedTask
const isRanked = (i: Item): i is RankedTask => 'task' in i

export function TaskList({
  items,
  hideProject,
  showReasons,
  children,
}: {
  items: Item[]
  hideProject?: boolean
  showReasons?: boolean
  children?: ReactNode
}) {
  return (
    <ul className="divide-y divide-line">
      {items.map((item) => {
        const task = isRanked(item) ? item.task : item
        const reason = showReasons && isRanked(item) ? item.reasons[0] : undefined
        return <TaskRow key={task.id} task={task} hideProject={hideProject} reason={reason} />
      })}
      {children}
    </ul>
  )
}
