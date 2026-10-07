import type { Eip1193Provider, WalletOption } from './types'

/**
 * Finds wallets installed in this browser using EIP-6963, the standard that
 * MetaMask, Rabby, Coinbase Wallet and most other extensions use to announce
 * themselves. No wallet-specific code, no extra package.
 */
type Eip6963Detail = {
  info: { uuid: string; name: string; icon?: string; rdns: string }
  provider: Eip1193Provider
}

export function discoverInjectedWallets(timeoutMs = 300): Promise<WalletOption[]> {
  return new Promise((resolve) => {
    const found = new Map<string, WalletOption>()
    const onAnnounce = (event: Event) => {
      const detail = (event as CustomEvent<Eip6963Detail>).detail
      if (!detail?.info || !detail.provider || found.has(detail.info.rdns)) return
      found.set(detail.info.rdns, {
        id: detail.info.rdns,
        name: detail.info.name,
        icon: detail.info.icon?.startsWith('data:image/') ? detail.info.icon : undefined,
        kind: 'injected',
        connect: async () => detail.provider,
      })
    }
    window.addEventListener('eip6963:announceProvider', onAnnounce)
    window.dispatchEvent(new Event('eip6963:requestProvider'))
    setTimeout(() => {
      window.removeEventListener('eip6963:announceProvider', onAnnounce)
      // Older wallets that only set window.ethereum.
      const legacy = (window as { ethereum?: Eip1193Provider }).ethereum
      if (!found.size && legacy && typeof legacy.request === 'function') {
        found.set('window.ethereum', {
          id: 'window.ethereum',
          name: 'Browser wallet',
          kind: 'injected',
          connect: async () => legacy,
        })
      }
      resolve([...found.values()])
    }, timeoutMs)
  })
}
