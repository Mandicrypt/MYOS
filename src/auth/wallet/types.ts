/** The standard Ethereum wallet interface (EIP-1193). Every supported wallet speaks it. */
export type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] | Record<string, unknown> }) => Promise<unknown>
}

/** A wallet the person can pick. */
export type WalletOption = {
  id: string
  name: string
  /** Small icon from the wallet itself (a data: URL), if it gave one. */
  icon?: string
  kind: 'injected' | 'walletconnect'
  /** Returns a connected provider. May open the wallet's own window. */
  connect: () => Promise<Eip1193Provider>
  /** Called after sign-in so nothing stays connected that MYOS doesn't need. */
  disconnect?: () => Promise<void>
}
