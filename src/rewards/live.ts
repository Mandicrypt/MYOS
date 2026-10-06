import { supabase } from '@/lib/supabase'
import type { PeriodKind } from './periods'

/**
 * Live (authoritative) reward data, read from the database. Only the server
 * writes these tables; the browser can read finalised results, never change them.
 */
export type LiveEntry = {
  rank: number
  displayAddress: string
  activityScore: number
  multiplier: number
  finalScore: number
  userId: string
}
export type LiveHistory = {
  periodKind: PeriodKind
  startsAt: string
  endsAt: string
  rank: number
  activityScore: number
  multiplier: number
  finalScore: number
  reward: number | null
  asset: string | null
}

/** The most recent finalised leaderboard of this kind, if one exists. */
export async function loadLatestLeaderboard(
  kind: PeriodKind,
): Promise<{ startsAt: string; endsAt: string; entries: LiveEntry[] } | null> {
  if (!supabase) return null
  const { data: periods } = await supabase
    .from('reward_periods')
    .select('id, starts_at, ends_at')
    .eq('kind', kind)
    .in('state', ['SNAPSHOT_TAKEN', 'CALCULATING', 'DISTRIBUTION_PENDING', 'DISTRIBUTED'])
    .order('starts_at', { ascending: false })
    .limit(1)
  const period = periods?.[0] as { id: string; starts_at: string; ends_at: string } | undefined
  if (!period) return null
  const { data } = await supabase
    .from('leaderboard_entries')
    .select('rank, display_address, activity_score, multiplier, final_score, user_id')
    .eq('period_id', period.id)
    .order('rank')
  const entries = ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    rank: Number(r.rank),
    displayAddress: String(r.display_address),
    activityScore: Number(r.activity_score),
    multiplier: Number(r.multiplier),
    finalScore: Number(r.final_score),
    userId: String(r.user_id),
  }))
  return { startsAt: period.starts_at, endsAt: period.ends_at, entries }
}

/** This user's past results (empty until the first real snapshot). */
export async function loadLiveHistory(userId: string): Promise<LiveHistory[]> {
  if (!supabase) return []
  const { data } = await supabase
    .from('leaderboard_entries')
    .select('period_id, rank, activity_score, multiplier, final_score, reward_periods(kind, starts_at, ends_at)')
    .eq('user_id', userId)
  const { data: allocations } = await supabase
    .from('reward_allocations')
    .select('period_id, amount, asset')
    .eq('user_id', userId)
  const paid = new Map(
    ((allocations ?? []) as { period_id: string; amount: number; asset: string }[]).map((a) => [a.period_id, a]),
  )
  return ((data ?? []) as Record<string, unknown>[]).map((r) => {
    const p = r.reward_periods as { kind: PeriodKind; starts_at: string; ends_at: string }
    const a = paid.get(String(r.period_id))
    return {
      periodKind: p.kind,
      startsAt: p.starts_at,
      endsAt: p.ends_at,
      rank: Number(r.rank),
      activityScore: Number(r.activity_score),
      multiplier: Number(r.multiplier),
      finalScore: Number(r.final_score),
      reward: a ? Number(a.amount) : null,
      asset: a?.asset ?? null,
    }
  })
}
