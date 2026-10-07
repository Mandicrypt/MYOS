import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { AuthPage } from '@/auth/AuthPage'
import { CalmScreen } from '@/auth/CalmScreen'
import { useAuth } from '@/auth/useAuth'
import { TokenPage } from '@/pages/TokenPage'
import { AccountStore } from './AccountStore'
import { LocalStore } from './LocalStore'

/**
 * The one place that decides what to show based on sign-in state.
 * Pages never check authentication themselves.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { state } = useAuth()
  const { pathname } = useLocation()
  // The token page is public: no sign-in, and no waiting for the session to load.
  if (pathname === '/token' && (state.status === 'signed-out' || state.status === 'loading')) {
    return <TokenPage standalone />
  }
  switch (state.status) {
    case 'disabled':
      return <LocalStore>{children}</LocalStore>
    case 'loading':
      return <CalmScreen label="Opening MYOS…" />
    case 'signed-out':
      return <AuthPage />
    case 'signed-in':
      return (
        <AccountStore key={state.user.id} user={state.user}>
          {children}
        </AccountStore>
      )
  }
}
