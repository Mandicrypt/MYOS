import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { reconcileWorkLog } from '@/engine/work-history'
import { todayISO } from '@/lib/dates'
import { newId } from '@/lib/id'
import { applyTheme, watchDeviceTheme } from '@/lib/theme'
import type { AppState } from '@/types'
import { reducer, type Action } from './reducer'
import { mergeStates } from './sync/merge'
import { stampChanges } from './timestamps'

/**
 * Where the store's state comes from and goes to. The store never knows
 * whether that is just this browser or this browser plus the cloud.
 */
export type StoreBackend = {
  initial: AppState
  /** Save to this device. Called after every change. */
  save: (state: AppState) => void
  /** Told about every change (cloud sync listens here). */
  onChange?: () => void
  /** Lets the sync layer read the live state and merge cloud data into it. */
  connect?: (link: StoreLink) => () => void
}

export type StoreLink = {
  getState: () => AppState
  merge: (cloud: AppState, base: AppState | null) => void
}

type InternalAction = Action | { type: 'sync/merge'; cloud: AppState; base: AppState | null }

/** The domain reducer, plus change timestamps and cloud merges. The domain reducer itself is unchanged. */
function storeReducer(state: AppState, action: InternalAction): AppState {
  if (action.type === 'sync/merge') return mergeStates(state, action.cloud, action.base)
  // Making occurrences isn't an edit: their timestamps come from their dates, so devices agree.
  if (action.type === 'recurrence/ensure') return reducer(state, action)
  return stampChanges(state, reducer(state, action))
}

type StoreValue = {
  state: AppState
  today: string
  dispatch: (action: Action) => void
  /** Returns to the state before the last change, keeping history intact. */
  undo: () => void
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ backend, children }: { backend: StoreBackend; children: ReactNode }) {
  const [state, rawDispatch] = useReducer(storeReducer, backend.initial)
  const history = useRef<AppState[]>([])
  const stateRef = useRef(state)
  const backendRef = useRef(backend)
  useLayoutEffect(() => {
    stateRef.current = state
    backendRef.current = backend
  })
  const [today, setToday] = useState(todayISO)

  // Make today's recurring occurrences (and catch up recent days). Does nothing if they all exist.
  useEffect(() => {
    rawDispatch({ type: 'recurrence/ensure' })
  }, [state, today])

  // Save locally on every change, and let sync know.
  const first = useRef(true)
  useEffect(() => {
    backendRef.current.save(state)
    if (first.current) {
      first.current = false
      return
    }
    backendRef.current.onChange?.()
  }, [state])

  useEffect(
    () =>
      backendRef.current.connect?.({
        getState: () => stateRef.current,
        merge: (cloud, base) => rawDispatch({ type: 'sync/merge', cloud, base }),
      }),
    [],
  )

  useEffect(() => {
    const theme = state.settings.theme
    applyTheme(theme)
    return theme === 'system' ? watchDeviceTheme(() => applyTheme(theme)) : undefined
  }, [state.settings.theme])

  // Keep "today" correct if the app stays open past midnight.
  useEffect(() => {
    const t = window.setInterval(() => setToday(todayISO()), 60_000)
    return () => window.clearInterval(t)
  }, [])

  const dispatch = useCallback((action: Action) => {
    if (action.type !== 'note/update') history.current = [...history.current.slice(-19), stateRef.current]
    rawDispatch(action)
  }, [])

  const undo = useCallback(() => {
    const prev = history.current.pop()
    if (!prev) return
    const current = stateRef.current
    // Records go back to how they were, but history only ever grows:
    // the event logs are kept, with entries added so work totals match again.
    const log = current.workEvents
    const fixes = reconcileWorkLog(prev.tasks, log, newId, new Date().toISOString())
    rawDispatch({ type: 'state/replace', state: { ...prev, workEvents: [...log, ...fixes], events: current.events } })
  }, [])

  const value = useMemo(() => ({ state, today, dispatch, undo }), [state, today, dispatch, undo])
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside StoreProvider')
  return ctx
}
