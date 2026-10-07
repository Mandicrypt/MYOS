import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { EthereumWallet, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { AuthContext, type AuthApi, type AuthState } from './auth-context'
import { friendlyAuthError } from './auth-errors'
import { walletOf } from './wallet/identity'

const toState = (session: Session | null): AuthState =>
  session
    ? {
        status: 'signed-in',
        user: { id: session.user.id, email: session.user.email || null, wallet: walletOf(session) },
      }
    : { status: 'signed-out' }

/** Plain sign-in statement shown in the wallet. One line, no new lines (required by the standard). */
const SIWE_STATEMENT =
  'Sign in to MYOS. This only proves you own this wallet. It costs nothing and sends no transaction.'

type SupabaseWallet = EthereumWallet

/** The single source of truth for who is signed in. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(supabase ? { status: 'loading' } : { status: 'disabled' })

  useEffect(() => {
    if (!supabase) return
    let active = true
    supabase.auth.getSession().then(({ data }) => active && setState(toState(data.session)))
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      // Only react to who is signed in, not to routine token refreshes.
      setState((prev) => {
        const next = toState(session)
        if (prev.status === 'signed-in' && next.status === 'signed-in' && prev.user.id === next.user.id) return prev
        return next
      })
    })
    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  const api = useMemo<AuthApi>(
    () => ({
      state,
      async signIn(email, password) {
        if (!supabase) return
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw new Error(friendlyAuthError(error.message))
      },
      async signUp(email, password) {
        if (!supabase) return { needsConfirmation: false }
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw new Error(friendlyAuthError(error.message))
        return { needsConfirmation: !data.session }
      },
      async signInWithWallet(wallet, onStep) {
        if (!supabase) return
        onStep?.('connecting')
        const provider = await wallet.connect()
        try {
          // 1. The wallet shares an address. Saying no stops here: nothing is created.
          const accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[] | undefined
          if (!accounts?.length) throw Object.assign(new Error('No account was shared.'), { code: 4001 })
          onStep?.('signing')
          // 2. The wallet signs a Sign-In with Ethereum (EIP-4361) message.
          // 3. Supabase Auth verifies the signature on its server before creating or restoring the user.
          const { error } = await supabase.auth.signInWithWeb3({
            chain: 'ethereum',
            // Every EIP-1193 wallet also has on/removeListener; MYOS's own type only lists what it uses.
            wallet: provider as unknown as SupabaseWallet,
            statement: SIWE_STATEMENT,
            // Sign for the page address without the in-app route (#/...).
            options: { url: `${window.location.origin}${window.location.pathname}` },
          })
          if (error) throw error
          onStep?.('verifying')
        } finally {
          await wallet.disconnect?.().catch(() => undefined)
        }
      },
      async signOut() {
        if (!supabase) return
        await supabase.auth.signOut()
      },
    }),
    [state],
  )

  return <AuthContext.Provider value={api}>{children}</AuthContext.Provider>
}
