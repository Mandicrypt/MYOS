import { friendlyAuthError } from '../auth-errors'

/** True for "the user said no" errors from any EIP-1193 wallet. */
export function isUserRejection(error: unknown): boolean {
  const e = error as { code?: number; message?: string; cause?: { code?: number } } | null
  if (!e) return false
  if (e.code === 4001 || e.cause?.code === 4001) return true
  return /user rejected|user denied|rejected the request|cancel|modal closed|connection request reset/i.test(
    e.message ?? '',
  )
}

/** Plain-language message for anything that stops a wallet sign-in. */
export function friendlyWalletError(error: unknown): string {
  if (isUserRejection(error))
    return 'You cancelled the request in your wallet. Nothing was signed and no account was created.'
  const e = error as { code?: number; message?: string } | undefined
  if (e?.code === -32002 || /already pending/i.test(e?.message ?? ''))
    return 'Your wallet already has a request waiting. Open your wallet to continue.'
  const message = e?.message ?? ''
  if (/eth_requestAccounts|no accounts|unlock/i.test(message))
    return 'Couldn’t connect to your wallet. Unlock it and try again.'
  const friendly = friendlyAuthError(message)
  if (friendly !== message) return friendly
  // Unknown problem: say so plainly, and include the original reason so it can be fixed.
  const detail = message.replace(/^@supabase\/auth-js:\s*/, '').trim()
  return detail ? `Wallet sign-in didn’t complete. (${detail})` : 'Wallet sign-in didn’t complete. Please try again.'
}

export const shortAddress = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`
