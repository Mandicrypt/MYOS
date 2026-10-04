import { Plus } from 'lucide-react'
import { useRef, useState } from 'react'
import { useStore } from '@/store/store'
import { useToast } from '@/components/ui/Toast'
import type { NewTask } from '@/store/reducer'

type AddTaskInlineProps = {
  label?: string
  defaults?: Omit<NewTask, 'title'>
}

/** "+ Add something" that turns into a one-line input. Stays open for adding several. */
export function AddTaskInline({ label = 'Add something', defaults }: AddTaskInlineProps) {
  const { dispatch } = useStore()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3.5 rounded-lg py-3 text-left text-base text-muted transition-colors hover:text-ink"
      >
        <span className="grid size-[22px] place-items-center">
          <Plus className="size-4" />
        </span>
        {label}
      </button>
    )
  }

  return (
    <form
      className="flex items-center gap-3.5 py-2"
      onSubmit={(e) => {
        e.preventDefault()
        const title = text.trim()
        if (!title) return
        dispatch({ type: 'task/add', task: { ...defaults, title } })
        setText('')
        toast.show('Added')
      }}
    >
      <span
        className="grid size-[22px] shrink-0 place-items-center rounded-full border border-dashed border-[var(--control)]"
        aria-hidden
      />
      <input
        ref={inputRef}
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => !text.trim() && setOpen(false)}
        onKeyDown={(e) => e.key === 'Escape' && (setText(''), setOpen(false))}
        placeholder="What needs doing? Press Enter to add"
        aria-label="New task"
        className="h-9 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-faint"
      />
    </form>
  )
}
