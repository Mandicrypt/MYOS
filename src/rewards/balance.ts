import { TOKEN, tokenConfigured, type TokenConfig } from './config'

/** Where a holding figure came from. Mock figures are never presented as real. */
export type BalanceSource = 'chain' | 'mock'

export type VerifiedHolding = {
  address: string
  /** Token amount (whole tokens, not base units). */
  balance: number
  usd: number
  source: BalanceSource
  verifiedAt: string
}

/** Anything that can verify how much MYOS a wallet holds, in USD. */
export interface HoldingVerifier {
  readonly source: BalanceSource
  verify(address: string): Promise<VerifiedHolding>
}

/** Reads a raw token balance from the chain (to be implemented once the token exists). */
export interface TokenBalanceReader {
  balanceOf(token: TokenConfig, address: string): Promise<bigint>
}

/** Price of one token in USD (to be implemented once a price source exists). */
export interface PriceFeed {
  usdPrice(token: TokenConfig): Promise<number>
}

export class TokenNotLaunchedError extends Error {
  constructor() {
    super('The MYOS token has not launched yet, so real balances cannot be verified.')
  }
}

/**
 * The real verifier: balance from the chain × price from a feed.
 * Refuses to run until a token is configured, rather than guessing.
 * In production this runs on the server at snapshot time, not in the browser.
 */
export class ChainHoldingVerifier implements HoldingVerifier {
  readonly source = 'chain' as const
  private readonly reader: TokenBalanceReader
  private readonly prices: PriceFeed
  private readonly token: TokenConfig
  constructor(reader: TokenBalanceReader, prices: PriceFeed, token: TokenConfig = TOKEN) {
    this.reader = reader
    this.prices = prices
    this.token = token
  }
  async verify(address: string): Promise<VerifiedHolding> {
    if (!this.token.chain || !this.token.contractAddress || (this.token === TOKEN && !tokenConfigured))
      throw new TokenNotLaunchedError()
    const [raw, price] = await Promise.all([
      this.reader.balanceOf(this.token, address),
      this.prices.usdPrice(this.token),
    ])
    const balance = Number(raw) / 10 ** this.token.decimals
    return { address, balance, usd: balance * price, source: 'chain', verifiedAt: new Date().toISOString() }
  }
}

/** Development only: holdings you set by hand. Always reports source "mock". */
export class MockHoldingVerifier implements HoldingVerifier {
  readonly source = 'mock' as const
  private readonly usdByAddress: Map<string, number>
  private readonly mockPrice: number
  constructor(usdByAddress: Map<string, number>, mockPrice = 0.05) {
    this.usdByAddress = usdByAddress
    this.mockPrice = mockPrice
  }
  async verify(address: string): Promise<VerifiedHolding> {
    const usd = this.usdByAddress.get(address.toLowerCase()) ?? 0
    return { address, balance: usd / this.mockPrice, usd, source: 'mock', verifiedAt: new Date().toISOString() }
  }
}
