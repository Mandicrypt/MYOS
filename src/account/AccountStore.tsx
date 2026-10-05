import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { AuthUser } from '@/auth/auth-context'
import { CalmScreen } from '@/auth/CalmScreen'
import { useAuth } from '@/auth/useAuth'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import type { CloudRepository } from '@/store/cloud/repository'
import { rowsToState } from '@/store/cloud/rows'
import { SupabaseRepository } from '@/store/cloud/supabase-repository'
import {
  emptyState,
  hasMeaningfulData,
  LEGACY_KEY,
  readCache,
  removeCache,
  STATE_VERSION,
  userCacheKey,
  writeCache,
} from '@/store/persistence'
import { StoreProvider, type StoreBackend, type StoreLink } from '@/store/store'
import { SyncController, type SyncStatus } from '@/store/sync/controller'
import { prepareImport } from '@/store/sync/import'
import { stampChanges } from '@/store/timestamps'
import type { AppState } from '@/types'
import { AccountContext, type AccountInfo } from './account-context'

/** Remembers that this account already answered the "import this device's data?" question. */
const importChoiceKey = (userId: string) => `myos:v2:import-choice:${userId}`

type Phase =
  | { name: 'loading' }
  | { name: 'ask-import'; local: AppState; cloud: AppState }
  | { name: 'ready'; initial: AppState; base: AppState | null }
  | { name: 'unreachable' }

/** Give every record a timestamp, so a fresh upload is treated as newest. */
function stampAll(state: AppState): AppState {
  return stampChanges(emptyState(), { ...state, settings: { ...state.settings } })
}

/**
 * Everything for a signed-in person: their cached data, the first load from
 * the cloud, the one-time import question, and keeping devices in step.
 */
export function AccountStore({
  user,
  children,
  repo,
}: {
  user: AuthUser
  children: ReactNode
  repo?: CloudRepository
}) {
  const repository = useMemo(() => repo ?? new SupabaseRepository(supabase!), [repo])
  const cacheKey = userCacheKey(user.id)
  const [phase, setPhase] = useState<Phase>(() => {
    // Returning to this device: show cached data straight away, sync in the background.
    const cached = readCache(cacheKey)
    return cached ? { name: 'ready', initial: cached, base: null } : { name: 'loading' }
  })
  const [attempt, setAttempt] = useState(0)

  // First time on this device: nothing to show until the cloud answers.
  useEffect(() => {
    if (phase.name !== 'loading') return
    let cancelled = false
    repository
      .load(user.id)
      .then((snapshot) => {
        if (cancelled) return
        const cloud = rowsToState(snapshot, STATE_VERSION)
        const isNewAccount = snapshot.settings.length === 0
        const local = readCache(LEGACY_KEY)
        const answered = localStorage.getItem(importChoiceKey(user.id))
        if (isNewAccount && !answered && hasMeaningfulData(local)) {
          setPhase({ name: 'ask-import', local, cloud })
        } else if (isNewAccount) {
          setPhase({ name: 'ready', initial: stampAll(emptyState()), base: cloud })
        } else {
          setPhase({ name: 'ready', initial: cloud, base: cloud })
        }
      })
      .catch(() => !cancelled && setPhase({ name: 'unreachable' }))
    return () => {
      cancelled = true
    }
  }, [phase.name, repository, user.id, attempt])

  if (phase.name === 'loading') return <CalmScreen label="Opening MYOS…" />

  if (phase.name === 'unreachable') {
    return (
      <CalmScreen>
        <h1 className="mt-10 text-lg font-medium">Couldn’t reach your account</h1>
        <p className="mt-1.5 text-base text-muted">Check your connection, then try again.</p>
        <Button
          variant="primary"
          className="mt-6"
          onClick={() => {
            setAttempt((n) => n + 1)
            setPhase({ name: 'loading' })
          }}
        >
          Try again
        </Button>
      </CalmScreen>
    )
  }

  if (phase.name === 'ask-import') {
    const choose = (choice: 'import' | 'fresh') => {
      localStorage.setItem(importChoiceKey(user.id), choice)
      const initial = choice === 'import' ? stampAll(prepareImport(phase.local)) : stampAll(emptyState())
      // The device's original data stays where it is, untouched.
      setPhase({ name: 'ready', initial, base: phase.cloud })
    }
    return (
      <CalmScreen>
        <h1 className="mt-10 text-lg font-medium">We found MYOS data on this device.</h1>
        <p className="mt-1.5 text-base text-muted">
          Import it into your account? Your tasks, projects, notes and history come with it.
        </p>
        <div className="mt-8 flex flex-col gap-2">
          <Button variant="primary" size="lg" onClick={() => choose('import')}>
            Import my data
          </Button>
          <Button size="lg" onClick={() => choose('fresh')}>
            Start fresh
          </Button>
        </div>
        <p className="mt-4 text-sm text-muted">Either way, the data on this device isn’t deleted.</p>
      </CalmScreen>
    )
  }

  return (
    <SyncedStore
      key={user.id}
      user={user}
      repo={repository}
      initial={phase.initial}
      base={phase.base}
      cacheKey={cacheKey}
    >
      {children}
    </SyncedStore>
  )
}

function SyncedStore({
  user,
  repo,
  initial,
  base,
  cacheKey,
  children,
}: {
  user: AuthUser
  repo: CloudRepository
  initial: AppState
  base: AppState | null
  cacheKey: string
  children: ReactNode
}) {
  const { signOut: authSignOut } = useAuth()
  const [sync, setSync] = useState<SyncStatus>({ state: 'syncing', lastSyncedAt: null })
  const controllerRef = useRef<SyncController | null>(null)

  const backend = useMemo<StoreBackend>(
    () => ({
      initial,
      save: (state) => writeCache(cacheKey, state),
      onChange: () => controllerRef.current?.notifyChange(),
      connect: (link: StoreLink) => {
        const controller = new SyncController(
          { repo, userId: user.id, getState: link.getState, applyMerge: link.merge },
          base,
        )
        controllerRef.current = controller
        const unsubscribe = controller.subscribe(setSync)
        controller.start()
        return () => {
          unsubscribe()
          controller.stop()
          controllerRef.current = null
        }
      },
    }),
    // The backend is fixed for this signed-in session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const signOut = useCallback<Extract<AccountInfo, { mode: 'account' }>['signOut']>(
    async (options) => {
      const controller = controllerRef.current
      if (controller && !options?.force) {
        const ok = await controller.flush()
        if (!ok || controller.hasPendingChanges()) return 'unsynced'
      }
      controller?.stop()
      // Signing out leaves nothing of this account on the device.
      removeCache(cacheKey)
      SyncController.forget(user.id)
      // Whoever signs in next starts on Home, not on this person's last page.
      window.location.hash = '#/'
      await authSignOut()
      return 'signed-out'
    },
    [authSignOut, cacheKey, user.id],
  )

  const account = useMemo<AccountInfo>(
    () => ({
      mode: 'account',
      email: user.email,
      wallet: user.wallet,
      sync,
      syncNow: () => void controllerRef.current?.pull(),
      signOut,
    }),
    [user.email, user.wallet, sync, signOut],
  )

  return (
    <AccountContext.Provider value={account}>
      <StoreProvider backend={backend}>{children}</StoreProvider>
    </AccountContext.Provider>
  )
}
