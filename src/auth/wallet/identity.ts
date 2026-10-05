import type { Session } from '@supabase/supabase-js'

/**
 * The wallet address of a wallet sign-in. Supabase records it as a "web3"
 * identity: sub = "web3:ethereum:0x…", with the address also in custom_claims.
 */
export function walletOf(session: Session): string | null {
  const web3 = session.user.identities?.find((i) => i.provider === 'web3')
  if (!web3) return null
  const data = web3.identity_data as { sub?: string; custom_claims?: { address?: string } } | undefined
  const address = data?.custom_claims?.address ?? data?.sub?.split(':')[2]
  return typeof address === 'string' && address ? address : null
}
