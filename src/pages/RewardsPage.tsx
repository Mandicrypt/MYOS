import { useEffect, useMemo, useRef, useState } from 'react'
import { useAccount } from '@/account/account-context'
import { PageHeader } from '@/components/layout/PageHeader'
import { Section } from '@/components/layout/Section'
import { RewardWalletDialog } from '@/components/rewards/RewardWalletDialog'
import { Button } from '@/components/ui/Button'
import { Segmented } from '@/components/ui/Field'
import { activityBetween } from '@/engine/activity'
import { cn } from '@/lib/cn'
import { MockHoldingVerifier } from '@/rewards/balance'
import { MOCK_MODE, REWARDS_CONFIG, TOKEN, tokenConfigured } from '@/rewards/config'
import { evaluateHolding } from '@/rewards/eligibility'
import { estimatedReward, rankCandidates, shortAddress, type Candidate } from '@/rewards/leaderboard'
import { loadLatestLeaderboard, loadLiveHistory, type LiveEntry, type LiveHistory } from '@/rewards/live'
import { MOCK_ACTIVITY_OPTIONS, MOCK_HOLDING_OPTIONS, mockParticipants } from '@/rewards/mock'
import { readMock, writeMock, type MockHistoryRecord, type MockRewardsState } from '@/rewards/mock-store'
import {
  formatCountdown,
  msUntilSnapshot,
  periodAt,
  previousPeriod,
  utcDate,
  type PeriodKind,
  type RewardPeriod,
} from '@/rewards/periods'
import { advance, takeSnapshot, type RewardState, type Snapshot } from '@/rewards/snapshot'
import { linkWalletOnServer, loadRewardWallet } from '@/rewards/wallet'
import { useStore } from '@/store/store'

const ME = 'me'
const STATE_LABEL: Record<RewardState, string> = {
  UPCOMING: 'Upcoming',
  SNAPSHOT_PENDING: 'Snapshot pending',
  SNAPSHOT_TAKEN: 'Snapshot taken. Rankings locked.',
  CALCULATING: 'Calculating rewards…',
  DISTRIBUTION_PENDING: 'Rewards calculated. Distribution pending.',
  DISTRIBUTED: 'Rewards distributed',
}
const MEDAL = ['🥇', '🥈', '🥉']

function useNow(): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(t)
  }, [])
  return now
}

const money = (n: number, asset: string) =>
  `${n.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 })} ${asset}`
const usd = (n: number) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
const periodLabel = (p: RewardPeriod) =>
  p.kind === 'daily'
    ? `${utcDate(p.startsAt)} (UTC)`
    : `${utcDate(p.startsAt)} – ${utcDate(new Date(new Date(p.endsAt).getTime() - 1).toISOString())} (UTC)`

/** MYOS Rewards: optional, for token holders. Everything else in MYOS works without it. */
export function RewardsPage() {
  const { state } = useStore()
  const account = useAccount()
  const now = useNow()
  const [kind, setKind] = useState<PeriodKind>('daily')
  const [linking, setLinking] = useState(false)
  const mode: 'mock' | 'live' | 'prelaunch' = MOCK_MODE ? 'mock' : tokenConfigured ? 'live' : 'prelaunch'
  const signedIn = account.mode === 'account'
  const scope = signedIn ? account.userId : 'local'

  // --- Mock state (development only, this device only).
  const [mock, setMockState] = useState<MockRewardsState>(() => readMock(scope))
  const setMock = (patch: Partial<MockRewardsState>) =>
    setMockState((m) => {
      const next = { ...m, ...patch }
      writeMock(scope, next)
      return next
    })

  // --- Live reward wallet and results (read-only; written by the server).
  const [liveWallet, setLiveWallet] = useState<string | null>(null)
  const [live, setLive] = useState<{ entries: LiveEntry[]; startsAt: string; endsAt: string } | null>(null)
  const [liveHistory, setLiveHistory] = useState<LiveHistory[]>([])
  useEffect(() => {
    if (!signedIn || mode === 'mock') return
    void loadRewardWallet().then(setLiveWallet)
    void loadLiveHistory(account.userId).then(setLiveHistory)
  }, [signedIn, mode, account])
  useEffect(() => {
    if (mode === 'live') void loadLatestLeaderboard(kind).then(setLive)
  }, [mode, kind])

  const signInWallet = signedIn && account.wallet ? account.wallet.toLowerCase() : null
  const wallet = signInWallet ?? (mode === 'mock' ? mock.walletAddress : liveWallet)

  const period = periodAt(kind, now)
  const activity = useMemo(
    () => activityBetween(state, period.startsAt, period.endsAt),
    [state, period.startsAt, period.endsAt],
  )
  const myActivity = mode === 'mock' && mock.activityOverride !== null ? mock.activityOverride : activity.total
  const holding = mode === 'mock' ? evaluateHolding(mock.holdingUsd, REWARDS_CONFIG) : null
  const pool = REWARDS_CONFIG.pools[kind]

  // --- Mock leaderboard: simulated players plus you (if your wallet is connected).
  const candidates: Candidate[] = useMemo(
    () => [
      ...mockParticipants(kind),
      ...(wallet ? [{ userId: ME, address: wallet, activityScore: myActivity, holderUsd: mock.holdingUsd }] : []),
    ],
    [kind, wallet, myActivity, mock.holdingUsd],
  )
  const ranked = mode === 'mock' ? rankCandidates(candidates, REWARDS_CONFIG) : []
  const me = ranked.find((e) => e.userId === ME)

  // --- Snapshot simulation (mock only).
  const [sim, setSim] = useState<{ state: RewardState; snapshot: Snapshot | null }>({
    state: 'UPCOMING',
    snapshot: null,
  })
  const simulate = async (target: RewardPeriod) => {
    const inputs = candidates
      .filter((c) => c.userId !== ME || wallet)
      .map((c) => ({ userId: c.userId, address: c.address, activityScore: c.activityScore }))
    const holdings = new Map(candidates.map((c) => [c.address.toLowerCase(), c.holderUsd]))
    setSim({ state: 'SNAPSHOT_PENDING', snapshot: null })
    let snap = await takeSnapshot(
      target,
      inputs,
      new MockHoldingVerifier(holdings),
      REWARDS_CONFIG,
      new Date(target.endsAt),
    )
    const steps: RewardState[] = ['CALCULATING', 'DISTRIBUTION_PENDING', 'DISTRIBUTED']
    setSim({ state: snap.state, snapshot: snap })
    for (const step of steps) {
      await new Promise((r) => setTimeout(r, 900))
      snap = advance(snap, step)
      setSim({ state: snap.state, snapshot: snap })
    }
    const mine = snap.entries.find((e) => e.userId === ME)
    const reward = snap.allocations.find((a) => a.userId === ME)
    const record: MockHistoryRecord = {
      periodKey: target.key,
      kind: target.kind,
      startsAt: target.startsAt,
      endsAt: target.endsAt,
      takenAt: new Date().toISOString(),
      rank: mine?.rank ?? null,
      activityScore: mine?.activityScore ?? myActivity,
      multiplier: mine?.multiplier ?? 0,
      finalScore: mine?.finalScore ?? 0,
      reward: reward?.amount ?? null,
      asset: reward?.asset ?? null,
      participants: snap.entries.length,
    }
    setMockState((m) => {
      const next = {
        ...m,
        history: [record, ...m.history.filter((h) => h.periodKey !== record.periodKey)].slice(0, 50),
      }
      writeMock(scope, next)
      return next
    })
  }

  // When a period ends while the page is open, its snapshot runs (simulated in mock mode).
  // Remembered per kind, so switching between Daily and Weekly never looks like a period ending.
  const lastKeys = useRef<Partial<Record<RewardPeriod['kind'], string>>>({})
  useEffect(() => {
    const previous = lastKeys.current[period.kind]
    lastKeys.current[period.kind] = period.key
    if (previous && previous !== period.key && mode === 'mock') void simulate(previousPeriod(period))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period.key])

  const remaining = msUntilSnapshot(period, now)
  const history = mode === 'mock' ? mock.history : liveHistory

  return (
    <>
      <PageHeader
        title="Rewards"
        intro="Optional. Productive weeks can earn rewards for MYOS token holders. Everything else in MYOS works without a wallet."
      />

      {mode === 'mock' ? (
        <p role="note" className="mb-8 rounded-lg border border-line bg-surface px-4 py-3 text-base">
          <span className="font-medium">Development mock mode.</span>{' '}
          <span className="text-muted">
            Balances, other players, snapshots and rewards are simulated. Nothing here is real or paid out.
          </span>
        </p>
      ) : mode === 'prelaunch' ? (
        <p role="note" className="mb-8 rounded-lg border border-line bg-surface px-4 py-3 text-base text-muted">
          Rewards begin when the {TOKEN.symbol} token launches. You can connect a wallet now, and your activity score is
          already counting.
        </p>
      ) : null}

      <div className="space-y-14">
        <Section title="Your standing">
          <dl className="divide-y divide-line">
            <Row label="Wallet">
              {wallet ? (
                <span title={wallet}>
                  {shortAddress(wallet)}
                  <span className="text-muted">
                    {' '}
                    · {signInWallet ? 'verified at sign-in' : mode === 'mock' ? 'linked (mock)' : 'verified'}
                  </span>
                </span>
              ) : !signedIn && mode !== 'mock' ? (
                <span className="text-muted">Sign in to MYOS to take part.</span>
              ) : (
                <span className="flex flex-wrap items-center gap-3">
                  <span className="text-muted">Connect your wallet to check eligibility and take part.</span>
                  <Button onClick={() => setLinking(true)}>Connect wallet</Button>
                </span>
              )}
            </Row>
            <Row label={`${TOKEN.symbol} held`}>
              {mode === 'mock' ? (
                <span className="flex items-center gap-2">
                  <select
                    aria-label="Mock holding"
                    value={mock.holdingUsd}
                    onChange={(e) => setMock({ holdingUsd: Number(e.target.value) })}
                    className="rounded-md bg-transparent py-0.5 outline-none hover:bg-hover"
                  >
                    {MOCK_HOLDING_OPTIONS.map((v) => (
                      <option key={v} value={v}>
                        {usd(v)}
                      </option>
                    ))}
                  </select>
                  <span className="text-sm text-muted">mock value</span>
                </span>
              ) : (
                <span className="text-muted">
                  {mode === 'live' ? 'Verified on-chain at each snapshot' : 'Not available until launch'}
                </span>
              )}
            </Row>
            <Row label="Eligibility">
              {holding && wallet ? (
                holding.eligible ? (
                  <span className="text-calm-green">Eligible · {holding.multiplier.toFixed(2)}× multiplier</span>
                ) : (
                  <span>
                    Not eligible yet{' '}
                    <span className="text-muted">
                      · hold at least {usd(REWARDS_CONFIG.minimumUsd)} ({usd(holding.shortfallUsd)} more)
                    </span>
                  </span>
                )
              ) : (
                <span className="text-muted">
                  Hold at least {usd(REWARDS_CONFIG.minimumUsd)} of {TOKEN.symbol} in a connected wallet.
                </span>
              )}
            </Row>
          </dl>
          <details className="mt-3 text-sm text-muted">
            <summary className="cursor-pointer rounded-sm hover:text-ink">How the multiplier works</summary>
            <p className="mt-2">
              Final score = activity score × holder multiplier. Holding more helps, but productivity still decides.
            </p>
            <ul className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-4">
              {REWARDS_CONFIG.multiplierTiers.map((t, i) => {
                const next = REWARDS_CONFIG.multiplierTiers[i + 1]
                const current = holding?.tier?.minUsd === t.minUsd && wallet
                return (
                  <li key={t.minUsd} className={cn('tabular-nums', current && 'font-medium text-ink')}>
                    {usd(t.minUsd)}
                    {next ? `–${usd(next.minUsd - 1)}` : '+'}: {t.multiplier.toFixed(2)}×
                  </li>
                )
              })}
            </ul>
          </details>
        </Section>

        <section aria-label="Next snapshot">
          <p className="text-sm text-muted">{kind === 'daily' ? 'Daily' : 'Weekly'} reward snapshot in</p>
          <p className="mt-1 text-2xl font-medium tracking-[-0.02em] tabular-nums" aria-live="off">
            {formatCountdown(remaining)}
          </p>
          <p className="mt-1 text-sm text-muted">
            {new Date(period.endsAt).toLocaleString(undefined, {
              dateStyle: 'medium',
              timeStyle: 'short',
              timeZone: 'UTC',
            })}{' '}
            UTC · rankings lock and balances are verified at the snapshot
          </p>
          {mode === 'mock' ? (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button
                onClick={() => void simulate(period)}
                disabled={sim.state !== 'UPCOMING' && sim.state !== 'DISTRIBUTED'}
              >
                Simulate snapshot now
              </Button>
              {sim.state !== 'UPCOMING' ? (
                <span role="status" className="text-base">
                  {STATE_LABEL[sim.state]}
                </span>
              ) : null}
            </div>
          ) : null}
          {sim.snapshot && sim.state === 'DISTRIBUTED' ? (
            <ul className="mt-4 space-y-1 text-base" aria-label="Simulated distribution">
              {sim.snapshot.allocations.map((a) => {
                const entry = sim.snapshot!.entries.find((e) => e.userId === a.userId)!
                return (
                  <li
                    key={a.userId}
                    className={cn('flex justify-between gap-4 tabular-nums', a.userId === ME && 'font-medium')}
                  >
                    <span>
                      {MEDAL[a.rank - 1] ?? `#${a.rank}`} {a.userId === ME ? 'You' : shortAddress(entry.address)}
                    </span>
                    <span>{money(a.amount, a.asset)}</span>
                  </li>
                )
              })}
              {!sim.snapshot.allocations.length ? (
                <li className="text-muted">No reward pool is set for this period.</li>
              ) : null}
            </ul>
          ) : null}
        </section>

        <Section
          title="Leaderboard"
          aside={
            <Segmented<PeriodKind>
              label="Leaderboard period"
              value={kind}
              onChange={setKind}
              options={[
                { value: 'daily', label: 'Daily' },
                { value: 'weekly', label: 'Weekly' },
              ]}
            />
          }
        >
          <p className="-mt-1 mb-3 text-sm text-muted">
            {kind === 'daily' ? 'Today' : 'This week'} · {periodLabel(period)}
            {pool
              ? ` · pool ${money(pool.amount, pool.asset)} for the top ${REWARDS_CONFIG.topN}`
              : ' · reward pool not set yet'}
          </p>
          {mode === 'mock' ? (
            <Leaderboard entries={ranked} myId={ME} kind={kind} />
          ) : live && live.entries.length ? (
            <Leaderboard
              entries={live.entries.map((e) => ({ ...e, address: e.displayAddress, holderUsd: 0 }))}
              myId={signedIn ? account.userId : ''}
              kind={kind}
              note={`Last finalised: ${periodLabel({ kind, key: '', startsAt: live.startsAt, endsAt: live.endsAt })}`}
            />
          ) : (
            <p className="py-2 text-base text-muted">
              {mode === 'live'
                ? 'No finalised leaderboard yet. Rankings appear here after the first snapshot.'
                : 'Leaderboards start when rewards launch.'}
            </p>
          )}
          {mode === 'mock' && wallet && !me ? (
            <p className="mt-3 text-base text-muted">
              You’re not ranked yet:{' '}
              {holding?.eligible
                ? 'complete some meaningful work to score points.'
                : `hold at least ${usd(REWARDS_CONFIG.minimumUsd)} to take part.`}
            </p>
          ) : null}
        </Section>

        <Section
          title={`Your activity ${kind === 'daily' ? 'today' : 'this week'}`}
          aside={<span className="text-base tabular-nums">{myActivity.toLocaleString()} pts</span>}
        >
          {mode === 'mock' ? (
            <label className="mb-3 flex items-center gap-2 text-sm text-muted">
              Test with
              <select
                value={mock.activityOverride ?? ''}
                onChange={(e) => setMock({ activityOverride: e.target.value ? Number(e.target.value) : null })}
                className="rounded-md bg-transparent py-0.5 text-ink outline-none hover:bg-hover"
              >
                <option value="">my real activity</option>
                {MOCK_ACTIVITY_OPTIONS.map((v) => (
                  <option key={v} value={v}>
                    {v.toLocaleString()} points (mock)
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {activity.awards.length ? (
            <ul className="divide-y divide-line">
              {activity.awards.map((a) => (
                <li key={a.id} className="flex items-baseline justify-between gap-4 py-2.5">
                  <span className="min-w-0">
                    <span className="block truncate text-base">{a.label}</span>
                    {a.note ? <span className="block text-sm text-muted">{a.note}</span> : null}
                  </span>
                  <span className={cn('text-base tabular-nums', a.points ? 'text-calm-green' : 'text-muted')}>
                    +{a.points}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-2 text-base text-muted">
              Complete meaningful work, focus sessions, your daily plan or your weekly review to earn points.
            </p>
          )}
          <p className="mt-3 text-sm text-muted">
            Calculated on this device for your information. Official scores are calculated at the snapshot, where tiny
            or repeated tasks and other farming don’t count.
          </p>
        </Section>

        <Section title="Reward history">
          {history.length ? (
            <ul className="divide-y divide-line">
              {history.map((h, i) => {
                const rec = h as MockHistoryRecord & LiveHistory
                const k = rec.kind ?? rec.periodKind
                return (
                  <li key={i} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3">
                    <span className="text-base">
                      {k === 'daily' ? 'Daily' : 'Weekly'} ·{' '}
                      {periodLabel({ kind: k, key: '', startsAt: rec.startsAt, endsAt: rec.endsAt })}
                      {mode === 'mock' ? <span className="text-muted"> · mock</span> : null}
                    </span>
                    <span className="text-sm text-muted tabular-nums">
                      {rec.rank ? `#${rec.rank}` : 'Not ranked'} · {rec.activityScore} pts × {rec.multiplier.toFixed(2)}{' '}
                      = {rec.finalScore}
                      {rec.reward ? ` · ${money(rec.reward, rec.asset ?? '')}` : ''}
                    </span>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="py-2 text-base text-muted">No reward periods yet.</p>
          )}
        </Section>
      </div>

      <RewardWalletDialog
        open={linking}
        onOpenChange={setLinking}
        userId={signedIn ? account.userId : 'local'}
        onLinked={async (address, signed) => {
          if (mode === 'mock') setMock({ walletAddress: address })
          else setLiveWallet(await linkWalletOnServer(signed))
        }}
      />
    </>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:gap-6">
      <dt className="w-32 shrink-0 text-sm text-muted">{label}</dt>
      <dd className="min-w-0 text-base">{children}</dd>
    </div>
  )
}

type Row = {
  userId: string
  address: string
  rank: number
  activityScore: number
  multiplier: number
  finalScore: number
}

/** Top 10, plus your own row if you're further down. Addresses are always shortened. */
function Leaderboard({ entries, myId, kind, note }: { entries: Row[]; myId: string; kind: PeriodKind; note?: string }) {
  const pool = REWARDS_CONFIG.pools[kind]
  const top = entries.slice(0, REWARDS_CONFIG.topN)
  const mine = entries.find((e) => e.userId === myId)
  const mineOutside = mine && mine.rank > REWARDS_CONFIG.topN
  if (!entries.length) return <p className="py-2 text-base text-muted">No eligible players yet.</p>
  const line = (e: Row) => {
    const reward = estimatedReward(e.rank, pool, REWARDS_CONFIG)
    return (
      <tr key={e.userId} className={cn('border-b border-line last:border-b-0', e.userId === myId && 'bg-accent-soft')}>
        <td className="py-2.5 pr-3 tabular-nums">#{e.rank}</td>
        <td className="py-2.5 pr-3">
          {e.userId === myId ? (
            <span className="font-medium">You · {shortAddress(e.address)}</span>
          ) : (
            shortAddress(e.address)
          )}
        </td>
        <td className="hidden py-2.5 pr-3 text-right text-muted tabular-nums sm:table-cell">
          {e.activityScore.toLocaleString()}
        </td>
        <td className="hidden py-2.5 pr-3 text-right text-muted tabular-nums sm:table-cell">
          {e.multiplier.toFixed(2)}×
        </td>
        <td className="py-2.5 pr-3 text-right tabular-nums">{Math.round(e.finalScore).toLocaleString()}</td>
        <td className="py-2.5 text-right text-muted tabular-nums">
          {reward !== null && pool ? money(reward, pool.asset) : '—'}
        </td>
      </tr>
    )
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-base">
        <thead>
          <tr className="border-b border-line text-left text-sm text-muted">
            <th className="py-2 pr-3 font-normal">Rank</th>
            <th className="py-2 pr-3 font-normal">Wallet</th>
            <th className="hidden py-2 pr-3 text-right font-normal sm:table-cell">Activity</th>
            <th className="hidden py-2 pr-3 text-right font-normal sm:table-cell">Multiplier</th>
            <th className="py-2 pr-3 text-right font-normal">Final</th>
            <th className="py-2 text-right font-normal">Est. reward</th>
          </tr>
        </thead>
        <tbody>
          {top.map(line)}
          {mineOutside ? (
            <>
              <tr aria-hidden>
                <td colSpan={6} className="py-1 text-center text-muted">
                  ⋯
                </td>
              </tr>
              {line(mine)}
            </>
          ) : null}
        </tbody>
      </table>
      {mine ? (
        <p className="mt-3 text-base">
          Your rank: <span className="font-medium">#{mine.rank}</span> · final score{' '}
          {Math.round(mine.finalScore).toLocaleString()}
        </p>
      ) : null}
      {note ? <p className="mt-2 text-sm text-muted">{note}</p> : null}
    </div>
  )
}
