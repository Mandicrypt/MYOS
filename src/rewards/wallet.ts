import { supabase } from '@/lib/supabase'
import type { Eip1193Provider, WalletOption } from '@/auth/wallet/types'
import { buildLinkMessage } from '../../supabase/functions/_shared/link-message'

/** A wallet connected for rewards: address and network, read from the wallet itself. */
export type ConnectedWallet = { address: string; chainId: number; provider: Eip1193Provider; option: WalletOption }

type Listener = (event: { address?: string; chainId?: number; disconnected?: boolean }) => void

/** Connects to a wallet and keeps up with account / network changes while connected. */
export async function connectWallet(option: WalletOption, onChange?: Listener): Promise<ConnectedWallet> {
  const provider = await option.connect()
  const accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[] | undefined
  if (!accounts?.length) throw Object.assign(new Error('No account was shared.'), { code: 4001 })
  const chainId = parseInt(String(await provider.request({ method: 'eth_chainId' })), 16)
  const events = provider as Eip1193Provider & { on?: (e: string, fn: (v: unknown) => void) => void }
  events.on?.('accountsChanged', (v) => {
    const list = v as string[]
    onChange?.(list.length ? { address: list[0].toLowerCase() } : { disconnected: true })
  })
  events.on?.('chainChanged', (v) => onChange?.({ chainId: parseInt(String(v), 16) }))
  events.on?.('disconnect', () => onChange?.({ disconnected: true }))
  return { address: accounts[0].toLowerCase(), chainId, provider, option }
}

export async function disconnectWallet(wallet: ConnectedWallet | null): Promise<void> {
  await wallet?.option.disconnect?.().catch(() => undefined)
}

/** The wallet signs a message naming this MYOS account. Costs nothing, moves nothing. */
export async function signLinkMessage(
  wallet: ConnectedWallet,
  userId: string,
): Promise<{ message: string; signature: string }> {
  const message = buildLinkMessage({
    domain: window.location.host,
    address: wallet.address,
    userId,
    chainId: wallet.chainId,
    issuedAt: new Date().toISOString(),
  })
  const signature = (await wallet.provider.request({
    method: 'personal_sign',
    params: [toHex(message), wallet.address],
  })) as string
  return { message, signature }
}

function toHex(text: string): string {
  return `0x${[...new TextEncoder().encode(text)].map((b) => b.toString(16).padStart(2, '0')).join('')}`
}

/** Live mode: the server checks the signature, stores the wallet, and makes it the reward wallet. */
export async function linkWalletOnServer(signed: { message: string; signature: string }): Promise<string> {
  if (!supabase) throw new Error('Accounts are not set up on this MYOS.')
  const { data, error } = await supabase.functions.invoke<{ walletId: string; address: string; error?: string }>(
    'link-wallet',
    { body: signed },
  )
  if (error || !data?.walletId) {
    const detail = (error as { context?: { json?: () => Promise<{ error?: string }> } } | null)?.context
    const body: { error?: string } = detail?.json ? await detail.json().catch(() => ({})) : {}
    const reason = body.error
    throw new Error(reason ?? data?.error ?? 'Could not link the wallet. Please try again.')
  }
  const { error: rpcError } = await supabase.rpc('set_reward_wallet', { p_wallet_id: data.walletId })
  if (rpcError) throw new Error(rpcError.message)
  return data.address
}

/** Live mode: the reward wallet stored for this account, if any. */
export async function loadRewardWallet(): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.from('wallets').select('address, is_reward').order('is_reward', { ascending: false })
  const rows = (data ?? []) as { address: string; is_reward: boolean }[]
  return rows.find((r) => r.is_reward)?.address ?? rows[0]?.address ?? null
}
