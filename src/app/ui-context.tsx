import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { ID } from '@/types'

export type QuickAddKind = 'task' | 'idea' | 'note' | 'project' | 'goal'

type UiValue = {
  editingTaskId: ID | null
  editTask: (id: ID | null) => void
  quickAdd: { open: boolean; kind: QuickAddKind }
  openQuickAdd: (kind?: QuickAddKind) => void
  closeQuickAdd: () => void
}

const UiContext = createContext<UiValue | null>(null)

export function UiProvider({ children }: { children: ReactNode }) {
  const [editingTaskId, editTask] = useState<ID | null>(null)
  const [quickAdd, setQuickAdd] = useState<UiValue['quickAdd']>({ open: false, kind: 'task' })

  const openQuickAdd = useCallback((kind: QuickAddKind = 'task') => setQuickAdd({ open: true, kind }), [])
  const closeQuickAdd = useCallback(() => setQuickAdd((q) => ({ ...q, open: false })), [])

  // ⌘K / Ctrl+K opens quick add from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setQuickAdd((q) => ({ ...q, open: !q.open }))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <UiContext.Provider value={{ editingTaskId, editTask, quickAdd, openQuickAdd, closeQuickAdd }}>
      {children}
    </UiContext.Provider>
  )
}

export function useUi(): UiValue {
  const ctx = useContext(UiContext)
  if (!ctx) throw new Error('useUi must be used inside UiProvider')
  return ctx
}
