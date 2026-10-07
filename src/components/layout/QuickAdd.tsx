import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUi, type QuickAddKind } from '@/app/ui-context'
import { Button } from '@/components/ui/Button'
import { Segmented, inputClass } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { newId } from '@/lib/id'
import { useStore } from '@/store/store'

const kinds: { value: QuickAddKind; label: string; placeholder: string }[] = [
  { value: 'task', label: 'Task', placeholder: 'What needs doing?' },
  { value: 'idea', label: 'Inbox', placeholder: 'Whatever is on your mind' },
  { value: 'note', label: 'Note', placeholder: 'Note title' },
  { value: 'project', label: 'Project', placeholder: 'What are you building?' },
  { value: 'goal', label: 'Goal', placeholder: 'What are you working toward?' },
]

/** Global quick add (⌘K / Ctrl+K, or the + button on mobile). */
export function QuickAdd() {
  const { quickAdd, closeQuickAdd } = useUi()
  return (
    <Modal
      open={quickAdd.open}
      onOpenChange={(o) => !o && closeQuickAdd()}
      title="Add"
      description="Quickly add a task, inbox item, note, project or goal"
    >
      {/* Keyed so each opening starts fresh. */}
      <QuickAddForm key={`${quickAdd.open}-${quickAdd.kind}`} initialKind={quickAdd.kind} onDone={closeQuickAdd} />
    </Modal>
  )
}

function QuickAddForm({ initialKind, onDone }: { initialKind: QuickAddKind; onDone: () => void }) {
  const { today, dispatch } = useStore()
  const toast = useToast()
  const navigate = useNavigate()
  const [kind, setKind] = useState<QuickAddKind>(initialKind)
  const [text, setText] = useState('')
  const [forToday, setForToday] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)

  const current = kinds.find((k) => k.value === kind) ?? kinds[0]

  const submit = () => {
    const value = text.trim()
    if (!value) {
      inputRef.current?.focus()
      return
    }
    switch (kind) {
      case 'task':
        dispatch({ type: 'task/add', task: { title: value, plannedFor: forToday ? today : null } })
        toast.show(forToday ? 'Added to today' : 'Added to later')
        break
      case 'idea':
        dispatch({ type: 'inbox/add', text: value })
        toast.show('Added to inbox')
        break
      case 'note': {
        const id = newId()
        dispatch({ type: 'note/add', id, title: value })
        navigate(`/notes/${id}`)
        break
      }
      case 'project': {
        const id = newId()
        dispatch({ type: 'project/add', id, title: value })
        navigate(`/projects/${id}`)
        break
      }
      case 'goal': {
        const id = newId()
        dispatch({ type: 'goal/add', id, title: value })
        navigate(`/goals/${id}`)
        break
      }
    }
    onDone()
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      className="space-y-4"
    >
      <Segmented<QuickAddKind>
        label="Type"
        value={kind}
        onChange={(k) => (setKind(k), inputRef.current?.focus())}
        options={kinds}
      />
      <input
        ref={inputRef}
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={current.placeholder}
        aria-label={current.placeholder}
        className={`${inputClass} h-12 text-md`}
      />
      <div className="flex items-center justify-between gap-3">
        {kind === 'task' ? (
          <label className="flex items-center gap-2 text-base text-muted">
            <input
              type="checkbox"
              checked={forToday}
              onChange={(e) => setForToday(e.target.checked)}
              className="size-4 accent-[var(--primary)]"
            />
            Do it today
          </label>
        ) : (
          <span className="text-sm text-muted">{kind === 'idea' ? 'Sort it out later.' : ''}</span>
        )}
        <Button type="submit" variant="primary">
          Add
        </Button>
      </div>
    </form>
  )
}
