import { useState } from 'react'
import { useUi } from '@/app/ui-context'
import { Button } from '@/components/ui/Button'
import { inputClass } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { useStore } from '@/store/store'
import { useTaskActions } from './useTaskActions'

/** Asks one question: what is this task waiting for? */
export function WaitingDialog() {
  const { waitingTaskId, askWaiting } = useUi()
  const { state } = useStore()
  const task = state.tasks.find((t) => t.id === waitingTaskId)
  return (
    <Modal
      open={Boolean(task)}
      onOpenChange={(o) => !o && askWaiting(null)}
      title="What is it waiting for?"
      description="Mark this task as waiting"
    >
      {task ? <WaitingForm key={task.id} taskId={task.id} title={task.title} onDone={() => askWaiting(null)} /> : null}
    </Modal>
  )
}

function WaitingForm({ taskId, title, onDone }: { taskId: string; title: string; onDone: () => void }) {
  const { setWaiting } = useTaskActions('menu')
  const [text, setText] = useState('')
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        setWaiting(taskId, text.trim() || 'Something outside MYOS')
        onDone()
      }}
      className="space-y-4"
    >
      <p className="text-base text-muted">“{title}” will step out of your suggestions until you say it's ready.</p>
      <input
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="For example: a reply from the designer"
        aria-label="What it is waiting for"
        className={inputClass}
      />
      <div className="flex justify-end gap-2">
        <Button onClick={onDone}>Cancel</Button>
        <Button type="submit" variant="primary">
          Mark as waiting
        </Button>
      </div>
    </form>
  )
}
