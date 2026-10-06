import type { MultiplierTier, RewardsConfig } from './config'

export type Holding = {
  eligible: boolean
  /** 0 when not eligible. */
  multiplier: number
  tier: MultiplierTier | null
  /** USD still needed to become eligible. */
  shortfallUsd: number
}

/** Eligibility and holder multiplier for a verified USD holding. */
export function evaluateHolding(usd: number, config: RewardsConfig): Holding {
  const value = Number.isFinite(usd) && usd > 0 ? usd : 0
  if (value < config.minimumUsd)
    return { eligible: false, multiplier: 0, tier: null, shortfallUsd: config.minimumUsd - value }
  const tier = [...config.multiplierTiers].reverse().find((t) => value >= t.minUsd) ?? config.multiplierTiers[0]
  return { eligible: true, multiplier: tier.multiplier, tier, shortfallUsd: 0 }
}

/** Final score = activity score × holder multiplier, to 2 decimals. */
export function finalScore(activity: number, multiplier: number): number {
  return Math.round(activity * multiplier * 100) / 100
}
