import { useMemo, type ReactNode } from 'react'
import { loadState, saveState } from '@/store/persistence'
import { StoreProvider, type StoreBackend } from '@/store/store'

/** Local-only mode (no Supabase configured): everything stays in this browser, as before. */
export function LocalStore({ children }: { children: ReactNode }) {
  const backend = useMemo<StoreBackend>(() => ({ initial: loadState(), save: saveState }), [])
  return <StoreProvider backend={backend}>{children}</StoreProvider>
}
