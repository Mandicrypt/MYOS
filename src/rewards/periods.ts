/**
 * Reward periods are the same for everyone, so they use UTC:
 * daily = 00:00–24:00 UTC, weekly = Monday 00:00 UTC to the next Monday (MYOS's
 * Monday–Sunday week). The snapshot is taken when a period ends.
 */
export type PeriodKind = 'daily' | 'weekly'

export type RewardPeriod = {
  kind: PeriodKind
  /** Stable key, e.g. "daily:2026-10-05". */
  key: string
  startsAt: string
  endsAt: string
}

const DAY = 86_400_000

export function periodAt(kind: PeriodKind, now: Date): RewardPeriod {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  if (kind === 'weekly') start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7))
  const end = new Date(start.getTime() + (kind === 'daily' ? DAY : 7 * DAY))
  return {
    kind,
    key: `${kind}:${start.toISOString().slice(0, 10)}`,
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
  }
}

export function previousPeriod(period: RewardPeriod): RewardPeriod {
  return periodAt(period.kind, new Date(new Date(period.startsAt).getTime() - 1))
}

/** Milliseconds until the period's snapshot (never negative). */
export function msUntilSnapshot(period: RewardPeriod, now: Date): number {
  return Math.max(0, new Date(period.endsAt).getTime() - now.getTime())
}

export function formatCountdown(ms: number): string {
  const s = Math.floor(ms / 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  const days = Math.floor(s / 86400)
  const hms = `${pad(Math.floor((s % 86400) / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`
  return days ? `${days}d ${hms}` : hms
}

/** "Mon 5 Oct" style, in UTC, for unambiguous period labels. */
export function utcDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
}
