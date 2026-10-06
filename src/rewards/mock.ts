import type { Candidate } from './leaderboard'

/**
 * Development-only participants so leaderboards can be tested before launch.
 * Deterministic (same every time), with activity and holdings spread across
 * every tier, including some below the minimum. Never shown without a "mock" label.
 */
const ACTIVITY = [
  2000, 1450, 1240, 1180, 1095, 1000, 980, 870, 820, 760, 701, 640, 612, 590, 540, 500, 420, 350, 300, 220, 150, 100,
  80, 40,
]
const HOLDINGS = [
  20, 2500, 500, 50, 250, 1000, 20, 100, 49.99, 250, 20, 500, 2500, 50, 19.99, 100, 20, 1000, 50, 5, 250, 20, 100, 20,
]

function hexFrom(seed: number): string {
  let x = seed * 2654435761
  let out = ''
  while (out.length < 40) {
    x = (x ^ (x >>> 13)) * 1274126177
    out += (x >>> 0).toString(16).padStart(8, '0')
  }
  return `0x${out.slice(0, 40)}`
}

export function mockParticipants(kind: 'daily' | 'weekly'): Candidate[] {
  return ACTIVITY.map((activity, i) => ({
    userId: `mock-user-${i + 1}`,
    address: hexFrom(i + 7),
    // A week holds several days of work.
    activityScore: kind === 'weekly' ? Math.round(activity * 4.6) : activity,
    holderUsd: HOLDINGS[i],
  }))
}

/** Holdings the developer can try for their own wallet. */
export const MOCK_HOLDING_OPTIONS = [0, 19.99, 20, 50, 100, 250, 500, 1000, 2500]
/** Activity scores the developer can try instead of their real activity. */
export const MOCK_ACTIVITY_OPTIONS = [100, 500, 1000, 2000]
