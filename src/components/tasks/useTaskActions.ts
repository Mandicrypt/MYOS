import { useCallback, useMemo } from 'react'
import { meaningfulPoints } from '@/engine/meaningful-work'
import { addDays } from '@/lib/dates'
import { useStore } from '@/store/store'
import { useToast } from '@/components/ui/Toast'
import type { ID, UserImportance } from '@/types'

export type PlanTarget = 'today' | 'tomorrow' | 'later'

/** Task actions with a short confirmation and Undo. */
export function useTaskActions() {
  const { state, today, dispatch, undo } = useStore()
  const toast = useToast()
  const undoAction = useMemo(() => ({ label: 'Undo', run: undo }), [undo])

  const complete = useCallback(
    (id: ID) => {
      const task = state.tasks.find((t) => t.id === id)
      if (!task) return
      dispatch({ type: 'task/complete', id })
      const points = meaningfulPoints(task, state)
      toast.show(state.settings.showMeaningfulWork ? `Done · +${points} meaningful work` : 'Done', undoAction)
    },
    [state, dispatch, toast, undoAction],
  )

  const reopen = useCallback((id: ID) => dispatch({ type: 'task/reopen', id }), [dispatch])

  const plan = useCallback(
    (id: ID, target: PlanTarget) => {
      const plannedFor = target === 'today' ? today : target === 'tomorrow' ? addDays(today, 1) : null
      dispatch({ type: 'task/plan', id, plannedFor })
      toast.show(target === 'later' ? 'Moved to later' : `Moved to ${target}`, undoAction)
    },
    [today, dispatch, toast, undoAction],
  )

  const setImportance = useCallback(
    (id: ID, level: UserImportance) => {
      dispatch({ type: 'task/importance', id, level })
      toast.show(level === 'high' ? 'Marked important' : level === 'low' ? 'Marked less important' : 'Importance reset')
    },
    [dispatch, toast],
  )

  const remove = useCallback(
    (id: ID) => {
      dispatch({ type: 'task/delete', id })
      toast.show('Task removed', undoAction)
    },
    [dispatch, toast, undoAction],
  )

  return { complete, reopen, plan, setImportance, remove }
}
