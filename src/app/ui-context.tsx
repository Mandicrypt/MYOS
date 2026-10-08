import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { ID } from '@/types'

export type QuickAddKind = 'task' | 'idea' | 'note' | 'project' | 'goal'

type UiValue = {
  editingTaskId: ID | null
  editTask: (id: ID | null) => void
  /** Task whose "waiting for" question is open. */
  /** A recurring task the user asked to remove. We ask: just this day, or the whole routine? */
  removingTaskId: ID | null
  askRemove: (id: ID | null) => void
  waitingTaskId: ID | null
  askWaiting: (id: ID | null) => void
  searchOpen: boolean
  setSearchOpen: (open: boolean) => void
  quickAdd: { open: boolean; kind: QuickAddKind }
  openQuickAdd: (kind?: QuickAddKind) => void
  closeQuickAdd: () => void
}

const UiContext = createContext<UiValue | null>(null)

export function UiProvider({ children }: { children: ReactNode }) {
  const [editingTaskId, editTask] = useState<ID | null>(null)
  const [waitingTaskId, askWaiting] = useState<ID | null>(null)
  const [removingTaskId, askRemove] = useState<ID | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [quickAdd, setQuickAdd] = useState<UiValue['quickAdd']>({ open: false, kind: 'task' })

  const openQuickAdd = useCallback((kind: QuickAddKind = 'task') => setQuickAdd({ open: true, kind }), [])
  const closeQuickAdd = useCallback(() => setQuickAdd((q) => ({ ...q, open: false })), [])

  // ⌘K / Ctrl+K opens quick add from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const typing = target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName ?? '')
      if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        setSearchOpen(true)
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setQuickAdd((q) => ({ ...q, open: !q.open }))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <UiContext.Provider
      value={{
        editingTaskId,
        editTask,
        removingTaskId,
        askRemove,
        waitingTaskId,
        askWaiting,
        searchOpen,
        setSearchOpen,
        quickAdd,
        openQuickAdd,
        closeQuickAdd,
      }}
    >
      {children}
    </UiContext.Provider>
  )
}

export function useUi(): UiValue {
  const ctx = useContext(UiContext)
  if (!ctx) throw new Error('useUi must be used inside UiProvider')
  return ctx
}
