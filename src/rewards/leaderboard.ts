import type { RewardsConfig, RewardPool } from './config'
import { evaluateHolding, finalScore } from './eligibility'

/** One participant going into a ranking. */
export type Candidate = {
  userId: string
  address: string
  activityScore: number
  /** Verified (or, in development, mock) USD value of their MYOS holding. */
  holderUsd: number
}

export type RankedEntry = Candidate & {
  rank: number
  multiplier: number
  finalScore: number
}

export type Allocation = { userId: string; rank: number; asset: string; amount: number }

/** "0x82a3…91af" — never show full addresses by default. */
export function shortAddress(address: string): string {
  return address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address
}

/**
 * Ranks eligible participants by final score (not raw activity).
 * Ties: higher activity first, then user id, so the order is always the same.
 * Ineligible participants (below the minimum holding) are not ranked.
 */
export function rankCandidates(candidates: Candidate[], config: RewardsConfig): RankedEntry[] {
  return candidates
    .map((c) => ({ c, h: evaluateHolding(c.holderUsd, config) }))
    .filter(({ c, h }) => h.eligible && c.activityScore > 0)
    .map(({ c, h }) => ({
      ...c,
      multiplier: h.multiplier,
      finalScore: finalScore(c.activityScore, h.multiplier),
      rank: 0,
    }))
    .sort(
      (a, b) => b.finalScore - a.finalScore || b.activityScore - a.activityScore || a.userId.localeCompare(b.userId),
    )
    .map((e, i) => ({ ...e, rank: i + 1 }))
}

const UNITS = 100_000_000 // 8 decimal places, like ZEC

/**
 * Splits the pool across the top N by the configured percentages.
 * Works in whole units so the amounts always add up exactly; if fewer than N
 * people qualify, their shares are not handed to others (they stay in the pool).
 */
export function allocate(
  ranked: RankedEntry[],
  pool: RewardPool,
  config: RewardsConfig,
): { allocations: Allocation[]; unallocated: number } {
  if (!pool) return { allocations: [], unallocated: 0 }
  const totalPct = config.distribution.reduce((s, p) => s + p, 0)
  if (Math.abs(totalPct - 100) > 1e-9) throw new Error(`Reward distribution must add up to 100% (got ${totalPct}%)`)
  const totalUnits = Math.round(pool.amount * UNITS)
  const winners = ranked.slice(0, Math.min(config.topN, config.distribution.length))
  const unitsFor = config.distribution.map((p) => Math.floor((totalUnits * p) / 100))
  unitsFor[0] += totalUnits - unitsFor.reduce((s, u) => s + u, 0) // rounding dust to 1st place
  const allocations = winners.map((w, i) => ({
    userId: w.userId,
    rank: w.rank,
    asset: pool.asset,
    amount: unitsFor[i] / UNITS,
  }))
  const given = winners.reduce((s, _, i) => s + unitsFor[i], 0)
  return { allocations, unallocated: (totalUnits - given) / UNITS }
}

/** What a rank would receive, for showing "estimated reward". */
export function estimatedReward(rank: number, pool: RewardPool, config: RewardsConfig): number | null {
  if (!pool || rank < 1 || rank > Math.min(config.topN, config.distribution.length)) return null
  return Math.round(((pool.amount * config.distribution[rank - 1]) / 100) * UNITS) / UNITS
}
