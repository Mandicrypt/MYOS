import type { ReactNode } from 'react'
import { AuthPage } from '@/auth/AuthPage'
import { CalmScreen } from '@/auth/CalmScreen'
import { useAuth } from '@/auth/useAuth'
import { AccountStore } from './AccountStore'
import { LocalStore } from './LocalStore'

/**
 * The one place that decides what to show based on sign-in state.
 * Pages never check authentication themselves.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { state } = useAuth()
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
