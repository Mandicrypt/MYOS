import { createContext, useContext } from 'react'
import type { SyncStatus } from '@/store/sync/controller'

export type AccountInfo =
  | { mode: 'local' }
  | {
      mode: 'account'
      email: string | null
      /** The wallet address, for wallet sign-ins. */
      wallet: string | null
      sync: SyncStatus
      /** Try to sync right now. */
      syncNow: () => void
      /** Sign out. Resolves false if the user chose to stay because changes hadn't synced. */
      signOut: (options?: { force?: boolean }) => Promise<'signed-out' | 'unsynced'>
    }

export const AccountContext = createContext<AccountInfo>({ mode: 'local' })

export function useAccount(): AccountInfo {
  return useContext(AccountContext)
}
