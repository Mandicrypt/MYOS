import type { RewardsConfig } from './config'
import type { HoldingVerifier, BalanceSource } from './balance'
import { allocate, rankCandidates, type Allocation, type RankedEntry } from './leaderboard'
import type { RewardPeriod } from './periods'

/** Every state a reward period moves through, in order. It only ever moves forward. */
export const REWARD_STATES = [
  'UPCOMING',
  'SNAPSHOT_PENDING',
  'SNAPSHOT_TAKEN',
  'CALCULATING',
  'DISTRIBUTION_PENDING',
  'DISTRIBUTED',
] as const
export type RewardState = (typeof REWARD_STATES)[number]

export function canMove(from: RewardState, to: RewardState): boolean {
  return REWARD_STATES.indexOf(to) === REWARD_STATES.indexOf(from) + 1
}

/** A participant at snapshot time: their activity and the wallet to verify. */
export type SnapshotInput = {
  userId: string
  address: string
  activityScore: number
  /**
   * When this wallet became the user's reward wallet. A wallet chosen after the
   * period began doesn't count until the next period, so nobody can switch to a
   * richer wallet just before a snapshot.
   */
  walletSelectedAt?: string
}

/** Someone left out of a snapshot, and why. */
export type Exclusion = { userId: string; reason: string }

export type Snapshot = {
  period: RewardPeriod
  state: RewardState
  takenAt: string
  /** The config used, copied, so later changes never rewrite this result. */
  config: RewardsConfig
  balanceSource: BalanceSource
  entries: RankedEntry[]
  allocations: Allocation[]
  unallocated: number
  distributedAt: string | null
  /** Participants left out before ranking (e.g. wallet changed during the period). */
  excluded?: Exclusion[]
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const v of Object.values(value)) deepFreeze(v)
  }
  return value
}

/**
 * Takes the snapshot, in the order that protects against gaming:
 * 1 wallet → 2 verified balance → 3 USD value → 4 eligibility → 5 multiplier
 * → 6 final score → 7 locked ranking. Balances are read here, at snapshot time,
 * never taken from what a browser reported earlier.
 */
export async function takeSnapshot(
  period: RewardPeriod,
  participants: SnapshotInput[],
  verifier: HoldingVerifier,
  config: RewardsConfig,
  now: Date = new Date(),
): Promise<Snapshot> {
  if (now.getTime() < new Date(period.endsAt).getTime())
    throw new Error('A snapshot can only be taken after its period ends')
  // One entry per user: if someone appears twice, only their first wallet counts.
  // And one user per wallet: a wallet can't be entered twice under different accounts.
  const excluded: Exclusion[] = []
  const seenUsers = new Set<string>()
  const seenWallets = new Set<string>()
  const unique = participants.filter((p) => {
    const wallet = p.address.toLowerCase()
    if (seenUsers.has(p.userId)) return false
    if (seenWallets.has(wallet)) {
      excluded.push({ userId: p.userId, reason: 'Wallet already entered by another account' })
      return false
    }
    if (p.walletSelectedAt && p.walletSelectedAt > period.startsAt) {
      excluded.push({
        userId: p.userId,
        reason: 'Reward wallet changed during this period; it counts from the next one',
      })
      return false
    }
    seenUsers.add(p.userId)
    seenWallets.add(wallet)
    return true
  })
  const verified = await Promise.all(unique.map(async (p) => ({ p, h: await verifier.verify(p.address) })))
  const entries = rankCandidates(
    verified.map(({ p, h }) => ({
      userId: p.userId,
      address: p.address,
      activityScore: p.activityScore,
      holderUsd: h.usd,
    })),
    config,
  )
  return deepFreeze({
    period,
    state: 'SNAPSHOT_TAKEN' as const,
    takenAt: now.toISOString(),
    config: structuredClone(config),
    balanceSource: verifier.source,
    entries,
    allocations: [],
    unallocated: 0,
    distributedAt: null,
    excluded,
  })
}

/** Moves a snapshot to its next state, returning a new frozen snapshot. The ranking never changes. */
export function advance(snapshot: Snapshot, to: RewardState, now: Date = new Date()): Snapshot {
  if (!canMove(snapshot.state, to)) throw new Error(`Cannot move a reward period from ${snapshot.state} to ${to}`)
  let next: Snapshot = { ...snapshot, state: to }
  if (to === 'DISTRIBUTION_PENDING') {
    const pool = snapshot.config.pools[snapshot.period.kind]
    const { allocations, unallocated } = allocate(snapshot.entries, pool, snapshot.config)
    next = { ...next, allocations, unallocated }
  }
  if (to === 'DISTRIBUTED') next = { ...next, distributedAt: now.toISOString() }
  return deepFreeze(next)
}
