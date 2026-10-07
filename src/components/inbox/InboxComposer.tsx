import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useStore } from '@/store/store'

/** Always-ready input: type, press Enter, done. */
export function InboxComposer() {
  const { dispatch } = useStore()
  const [text, setText] = useState('')
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        const value = text.trim()
        if (!value) return
        dispatch({ type: 'inbox/add', text: value })
        setText('')
      }}
      className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 transition-colors focus-within:border-accent"
    >
      <Plus aria-hidden className="size-4 shrink-0 text-muted" />
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add to inbox"
        aria-label="Add to inbox"
        className="h-12 min-w-0 flex-1 bg-transparent text-md outline-none placeholder:text-muted"
      />
      {text.trim() ? (
        <button type="submit" className="rounded-md px-2 py-1 text-base font-medium text-accent-ink">
          Add
        </button>
      ) : null}
    </form>
  )
}
