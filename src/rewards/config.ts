/**
 * MYOS Rewards configuration. Change rewards here, nowhere else.
 *
 * The MYOS token does not exist yet, so its details come from environment
 * variables and are empty until launch. Nothing about the token is invented.
 */
// import.meta.env is Vite-only; checks run in plain Node, where these are simply unset.
const env: Partial<ImportMetaEnv> = import.meta.env ?? {}

export type TokenConfig = {
  /** CAIP-2 chain id, e.g. "eip155:8453". Unset until the token exists. */
  chain: string | null
  contractAddress: string | null
  symbol: string
  decimals: number
}

export const TOKEN: TokenConfig = {
  chain: env.VITE_MYOS_TOKEN_CHAIN || null,
  contractAddress: env.VITE_MYOS_TOKEN_CONTRACT_ADDRESS || null,
  symbol: env.VITE_MYOS_TOKEN_SYMBOL || 'MYOS',
  decimals: Number(env.VITE_MYOS_TOKEN_DECIMALS || 18),
}

/** True only once a real token has been configured. */
export const tokenConfigured = Boolean(TOKEN.chain && TOKEN.contractAddress)

/**
 * Whether mock mode may be on, given the settings. Pure, so it can be checked.
 * Mock mode is only ever allowed while NO real token is configured: once the
 * token exists, a leftover mock setting is ignored and real data is used.
 */
export function mockModeAllowed(mockFlag: string | undefined, hasRealToken: boolean): boolean {
  return mockFlag === 'true' && !hasRealToken
}

/**
 * Development mock mode: fake balances and a fake leaderboard, for testing.
 * Off unless explicitly switched on at build time (never from browser storage),
 * impossible once a real token is configured, and always labelled in the UI.
 */
export const MOCK_MODE = mockModeAllowed(env.VITE_MYOS_REWARDS_MOCK, tokenConfigured)

if (env.VITE_MYOS_REWARDS_MOCK === 'true' && tokenConfigured) {
  console.warn('MYOS: VITE_MYOS_REWARDS_MOCK is set but a real token is configured. Mock mode is ignored.')
}

export type MultiplierTier = { minUsd: number; multiplier: number }
export type RewardPool = { asset: string; amount: number } | null

export type RewardsConfig = {
  minimumUsd: number
  /** Ascending by minUsd. The first tier's minUsd should equal minimumUsd. */
  multiplierTiers: MultiplierTier[]
  topN: number
  /** Percent of the pool for rank 1, 2, 3… Must add up to 100. */
  distribution: number[]
  pools: { daily: RewardPool; weekly: RewardPool }
}

export const REWARDS_CONFIG: RewardsConfig = {
  minimumUsd: 20,
  multiplierTiers: [
    { minUsd: 20, multiplier: 1.0 },
    { minUsd: 50, multiplier: 1.1 },
    { minUsd: 100, multiplier: 1.25 },
    { minUsd: 250, multiplier: 1.5 },
    { minUsd: 500, multiplier: 1.75 },
    { minUsd: 1000, multiplier: 2.0 },
    { minUsd: 2500, multiplier: 2.25 },
  ],
  topN: 10,
  distribution: [30, 20, 15, 10, 7, 5, 4, 3, 3, 3],
  pools: {
    daily: { asset: 'ZEC', amount: 10 },
    // Not decided yet: weekly rankings are shown without a reward estimate.
    weekly: null,
  },
}
