import { useUi } from '@/app/ui-context'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { describeRule } from '@/engine/recurrence'
import { useStore } from '@/store/store'
import { useTaskActions } from './useTaskActions'

/** Removing a repeating task: ask whether it is just this day or the whole routine. */
export function RecurringRemoveDialog() {
  const { removingTaskId, askRemove } = useUi()
  const { state } = useStore()
  const task = state.tasks.find((t) => t.id === removingTaskId)
  return (
    <Modal
      open={Boolean(task)}
      onOpenChange={(o) => !o && askRemove(null)}
      title="Remove a repeating task"
      description="Choose whether to skip one day or stop the routine"
    >
      {task ? <RemoveChoice taskId={task.id} onDone={() => askRemove(null)} /> : null}
    </Modal>
  )
}

function RemoveChoice({ taskId, onDone }: { taskId: string; onDone: () => void }) {
  const { state } = useStore()
  const { skipOccurrence, stopSeries } = useTaskActions('menu')
  const task = state.tasks.find((t) => t.id === taskId)!
  const series = state.series.find((s) => s.id === task.recurrenceId)
  return (
    <div className="space-y-5">
      <p className="text-base text-muted">
        “{task.title}” repeats{series ? ` (${describeRule(series).toLowerCase()})` : ''}. What would you like to do?
      </p>
      <div className="flex flex-col gap-2">
        <Button
          size="lg"
          onClick={() => {
            skipOccurrence(task.id)
            onDone()
          }}
        >
          Skip just this one
        </Button>
        {series ? (
          <Button
            size="lg"
            onClick={() => {
              stopSeries(series.id)
              onDone()
            }}
          >
            Stop the whole routine
          </Button>
        ) : null}
        <Button variant="quiet" onClick={onDone}>
          Cancel
        </Button>
      </div>
      <p className="text-sm text-muted">
        Days already done stay in your history either way. Skipping keeps tomorrow’s on.
      </p>
    </div>
  )
}
