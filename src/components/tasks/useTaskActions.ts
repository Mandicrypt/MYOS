import { useCallback, useMemo } from 'react'
import { scoreCompletion } from '@/engine/meaningful-work'
import { isBlocked } from '@/engine/relations'
import { addDays } from '@/lib/dates'
import { selectFocusTask } from '@/store/selectors'
import { useStore } from '@/store/store'
import { useToast } from '@/components/ui/Toast'
import type { ActionSource, ID, ISODate, Task, UserImportance } from '@/types'

export type PlanTarget = 'today' | 'tomorrow' | 'later'

/** Open tasks that will be able to start once `task` is done. */
export function tasksUnblockedBy(tasks: Task[], task: Task): Task[] {
  return tasks.filter(
    (t) =>
      t.status === 'open' &&
      !t.waitingOn &&
      t.dependsOn.includes(task.id) &&
      t.dependsOn.every((id) => id === task.id || tasks.find((x) => x.id === id)?.status !== 'open'),
  )
}

/**
 * Task actions with a short confirmation and Undo.
 * Each one tells the store where it came from and whether MYOS was
 * suggesting the task, so corrections can be learned from later.
 */
export function useTaskActions(source: ActionSource = 'list') {
  const { state, today, dispatch, undo } = useStore()
  const toast = useToast()
  const undoAction = useMemo(() => ({ label: 'Undo', run: undo }), [undo])
  const suggestedId = useMemo(() => selectFocusTask(state, today)?.id ?? null, [state, today])
  const meta = useCallback((id: ID) => ({ source, wasSuggested: id === suggestedId }), [source, suggestedId])

  const dayFor = useCallback(
    (target: PlanTarget): ISODate | null =>
      target === 'today' ? today : target === 'tomorrow' ? addDays(today, 1) : null,
    [today],
  )

  const complete = useCallback(
    (id: ID) => {
      const task = state.tasks.find((t) => t.id === id)
      if (!task) return
      const { points } = scoreCompletion(task, state)
      const unblocked = tasksUnblockedBy(state.tasks, task).length
      dispatch({ type: 'task/complete', id, ...meta(id) })
      const parts = ['Done']
      if (state.settings.showMeaningfulWork) parts.push(`+${points} meaningful work`)
      if (unblocked) parts.push(unblocked === 1 ? '1 task unblocked' : `${unblocked} tasks unblocked`)
      toast.show(parts.join(' · '), undoAction)
    },
    [state, dispatch, toast, undoAction, meta],
  )

  const reopen = useCallback((id: ID) => dispatch({ type: 'task/reopen', id, ...meta(id) }), [dispatch, meta])

  const plan = useCallback(
    (id: ID, target: PlanTarget) => {
      dispatch({ type: 'task/plan', id, plannedFor: dayFor(target), ...meta(id) })
      toast.show(target === 'later' ? 'Moved to later' : `Moved to ${target}`, undoAction)
    },
    [dispatch, dayFor, toast, undoAction, meta],
  )

  /** "Not now": the user turned down a task. Moves it and records the skip. */
  const skip = useCallback(
    (id: ID, target: PlanTarget = 'tomorrow') => {
      dispatch({ type: 'task/skip', id, plannedFor: dayFor(target), ...meta(id) })
      toast.show(target === 'later' ? 'Moved to later' : `Moved to ${target}`, undoAction)
    },
    [dispatch, dayFor, toast, undoAction, meta],
  )

  const setImportance = useCallback(
    (id: ID, level: UserImportance) => {
      dispatch({ type: 'task/importance', id, level, ...meta(id) })
      toast.show(
        level === 'high' ? 'Marked important' : level === 'low' ? 'Marked less important' : 'Importance reset',
        undoAction,
      )
    },
    [dispatch, toast, undoAction, meta],
  )

  const setWaiting = useCallback(
    (id: ID, waitingOn: string | null) => {
      dispatch({ type: 'task/waiting', id, waitingOn, ...meta(id) })
      toast.show(waitingOn ? 'Marked as waiting' : 'No longer waiting', undoAction)
    },
    [dispatch, toast, undoAction, meta],
  )

  const setSuppressed = useCallback(
    (id: ID, suppressed: boolean) => {
      dispatch({ type: 'task/suppress', id, suppressed, ...meta(id) })
      toast.show(suppressed ? "MYOS won't suggest this" : 'MYOS can suggest this again', undoAction)
    },
    [dispatch, toast, undoAction, meta],
  )

  const remove = useCallback(
    (id: ID) => {
      dispatch({ type: 'task/delete', id, ...meta(id) })
      toast.show('Task removed', undoAction)
    },
    [dispatch, toast, undoAction, meta],
  )

  return {
    complete,
    reopen,
    plan,
    skip,
    setImportance,
    setWaiting,
    setSuppressed,
    remove,
    isBlocked: (t: Task) => isBlocked(state, t),
  }
}
