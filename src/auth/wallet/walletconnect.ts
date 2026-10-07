import type { WalletOption } from './types'

/** Public WalletConnect project id (not a secret). Without it, the WalletConnect option is hidden. */
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string | undefined

export const walletConnectEnabled = Boolean(projectId)

/**
 * WalletConnect: phone wallets and any WalletConnect-compatible wallet, via QR code.
 * The library is only downloaded when someone actually picks it.
 */
export function walletConnectOption(): WalletOption | null {
  if (!projectId) return null
  let disconnect: (() => Promise<void>) | undefined
  return {
    id: 'walletconnect',
    name: 'WalletConnect',
    kind: 'walletconnect',
    async connect() {
      const { EthereumProvider } = await import('@walletconnect/ethereum-provider')
      const provider = await EthereumProvider.init({
        projectId,
        // Identity only: sign-in works on any EVM network; Ethereum mainnet is just the default.
        // No transactions are ever requested.
        optionalChains: [1, 10, 56, 137, 8453, 42161, 43114, 59144],
        showQrModal: true,
        methods: ['personal_sign', 'eth_chainId', 'eth_requestAccounts', 'eth_accounts'],
        metadata: {
          name: 'MYOS',
          description: 'A calm personal operating system',
          url: window.location.origin,
          icons: [],
        },
      })
      await provider.connect()
      disconnect = () => provider.disconnect()
      return provider
    },
    disconnect: async () => {
      await disconnect?.()
    },
  }
}
