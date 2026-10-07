import { createContext } from 'react'
import type { WalletOption } from './wallet/types'

export type WalletStep = 'connecting' | 'signing' | 'verifying'

export type AuthUser = {
  id: string
  email: string | null
  /** Set when the session came from a wallet sign-in. */
  wallet: string | null
}

export type AuthState =
  /** Supabase isn't configured: MYOS runs in local-only mode. */
  | { status: 'disabled' }
  /** Checking whether a session exists. */
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'signed-in'; user: AuthUser }

export type SignUpResult = { needsConfirmation: boolean }

export type AuthApi = {
  state: AuthState
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<SignUpResult>
  /**
   * Sign in with an Ethereum wallet (Sign-In with Ethereum). The wallet signs a
   * message; Supabase verifies the signature and creates or restores the account.
   */
  signInWithWallet: (wallet: WalletOption, onStep?: (step: WalletStep) => void) => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthApi | null>(null)
