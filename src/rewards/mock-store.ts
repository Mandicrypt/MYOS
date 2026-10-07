/**
 * Development mock state, kept on this device only and never sent to the database.
 * Everything in here is labelled "mock" in the UI.
 */
export type MockHistoryRecord = {
  periodKey: string
  kind: 'daily' | 'weekly'
  startsAt: string
  endsAt: string
  takenAt: string
  rank: number | null
  activityScore: number
  multiplier: number
  finalScore: number
  reward: number | null
  asset: string | null
  participants: number
}

export type MockRewardsState = {
  walletAddress: string | null
  holdingUsd: number
  /** null = use my real activity. */
  activityOverride: number | null
  history: MockHistoryRecord[]
}

const key = (scope: string) => `myos:rewards-mock:${scope}`
const EMPTY: MockRewardsState = { walletAddress: null, holdingUsd: 20, activityOverride: null, history: [] }

export function readMock(scope: string): MockRewardsState {
  try {
    return { ...EMPTY, ...(JSON.parse(localStorage.getItem(key(scope)) ?? 'null') ?? {}) }
  } catch {
    return EMPTY
  }
}

export function writeMock(scope: string, state: MockRewardsState): void {
  try {
    localStorage.setItem(key(scope), JSON.stringify(state))
  } catch {
    // Not important for a mock.
  }
}
