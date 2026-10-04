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
import { todayISO } from '@/lib/dates'
import type { AppState } from '@/types'
import { applyTheme, watchDeviceTheme } from '@/lib/theme'
import { loadState, saveState } from './persistence'
import { reducer, type Action } from './reducer'

type StoreValue = {
  state: AppState
  today: string
  dispatch: (action: Action) => void
  /** Restores the state from before the last change. */
  undo: () => void
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, rawDispatch] = useReducer(reducer, undefined, loadState)
  const history = useRef<AppState[]>([])
  const stateRef = useRef(state)
  useLayoutEffect(() => {
    stateRef.current = state
  }, [state])
  const [today, setToday] = useState(todayISO)

  useEffect(() => saveState(state), [state])

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
    if (prev) rawDispatch({ type: 'state/replace', state: prev })
  }, [])

  const value = useMemo(() => ({ state, today, dispatch, undo }), [state, today, dispatch, undo])
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside StoreProvider')
  return ctx
}
