/**
 * Plain checks for the decision logic. Run with: npx tsx scripts/check-engine.ts
 * No test framework needed; it throws on the first failure.
 */
import { buildSampleState } from '../src/data/sample'
import { engine } from '../src/engine/importance'
import { scoreCompletion } from '../src/engine/meaningful-work'
import { isForToday, suggestable, suggestNext } from '../src/engine/next'
import { countedCredits, netPoints } from '../src/engine/work-history'
import { isBlocked } from '../src/engine/relations'
import { addDays, todayISO } from '../src/lib/dates'
import { reducer } from '../src/store/reducer'
import { selectFocusTask, selectHome, selectReview } from '../src/store/selectors'
import type { AppState } from '../src/types'

let passed = 0
function check(name: string, ok: boolean, detail = '') {
  if (!ok) throw new Error(`FAIL: ${name} ${detail}`)
  passed++
  console.log(`  ✓ ${name}${detail ? `  (${detail})` : ''}`)
}
const today = todayISO()
const rank = (s: AppState) =>
  engine.rank(
    s.tasks.filter((t) => t.status === 'open'),
    { state: s, today },
  )
const pos = (s: AppState, id: string) => rank(s).findIndex((r) => r.task.id === id)
const get = (s: AppState, id: string) => rank(s).find((r) => r.task.id === id)!

let s = buildSampleState()

console.log('Home')
const home = selectHome(s, today)
check('focus is the blueprint', home.focus?.task.id === 't-blueprint', home.focus?.reasons.join(' · '))
check('home list stays small', home.today.length <= 4, `${home.today.length} items`)
check(
  'no score numbers in labels',
  rank(s).every((r) => r.reasons.every((l) => !/\d+\.\d/.test(l))),
)

console.log('Quick wins')
check('10-minute trivial task is below the 90-minute high-impact task', pos(s, 't-tidy') > pos(s, 't-blueprint'))
check(
  '…and below the other meaningful work planned today',
  pos(s, 't-tidy') > pos(s, 't-ux'),
  `tidy #${pos(s, 't-tidy')}, review #${pos(s, 't-ux')}`,
)

console.log('Dependencies')
check(
  'blueprint explains it is blocking 2 tasks',
  get(s, 't-blueprint').why.some((r) => r.short === 'Blocking 2 tasks'),
)
check('task model is blocked', get(s, 't-model').blocked)

console.log('Explanations')
check('waiting task is held out of suggestions', get(s, 't-announce').blocked)
check('Focus has full sentences', get(s, 't-blueprint').why.filter((r) => r.long).length >= 3)

console.log('Priority: user corrections')
const before = pos(s, 't-devenv')
s = reducer(s, { type: 'task/importance', id: 't-devenv', level: 'high', source: 'menu' })
check('marking important moves it up', pos(s, 't-devenv') < before, `#${before} → #${pos(s, 't-devenv')}`)
check(
  'importance change recorded',
  s.events.at(-1)?.type === 'task.importance_changed' && s.events.at(-1)?.data?.to === 'high',
)
const lowBefore = pos(s, 't-ux')
s = reducer(s, { type: 'task/importance', id: 't-ux', level: 'low', source: 'menu' })
check('marking not important moves it down', pos(s, 't-ux') > lowBefore)

console.log('Postpone')
s = reducer(s, { type: 'task/skip', id: 't-learn', plannedFor: addDays(today, 1), source: 'home', wasSuggested: false })
const learn = s.tasks.find((t) => t.id === 't-learn')!
check('postpone count goes up', learn.postponeCount === 1)
check(
  'skip and postpone both recorded',
  s.events
    .slice(-2)
    .map((e) => e.type)
    .join() === 'task.skipped,task.postponed',
)
check(
  'it leaves Today',
  !selectHome(s, today).today.some((r) => r.task.id === 't-learn') && selectHome(s, today).focus?.task.id !== 't-learn',
)

let r = buildSampleState()
r = reducer(r, {
  type: 'task/skip',
  id: 't-blueprint',
  plannedFor: addDays(today, 1),
  source: 'home',
  wasSuggested: true,
})
check(
  '"Not today" wins over a deadline',
  selectHome(r, today).focus?.task.id !== 't-blueprint',
  `now: ${selectHome(r, today).focus?.task.title}`,
)
check('…and counts as a postpone', r.tasks.find((t) => t.id === 't-blueprint')!.postponeCount === 1)

console.log('Completion')
const pre = s
const blueprint = s.tasks.find((t) => t.id === 't-blueprint')!
s = reducer(s, { type: 'task/complete', id: 't-blueprint', source: 'focus', wasSuggested: true })
const ev = s.workEvents.at(-1)!
check(
  'work event recorded with breakdown',
  ev.taskId === 't-blueprint' && ev.scoringVersion === 2 && !!ev.breakdown,
  `${ev.points} points`,
)
check(
  'dependents are now available',
  !isBlocked(
    s,
    s.tasks.find((t) => t.id === 't-model')!,
  ) &&
    !isBlocked(
      s,
      s.tasks.find((t) => t.id === 't-onboarding')!,
    ),
)
check('unblocked events recorded', s.events.filter((e) => e.type === 'task.unblocked').length === 2)
const next = suggestNext(s, today, blueprint, ['t-model', 't-onboarding'])
check(
  'next suggestion is newly unblocked work',
  ['t-model', 't-onboarding'].includes(next?.ranked.task.id ?? ''),
  `${next?.ranked.task.title} — ${next?.note}`,
)
check(
  'completion event knows it was suggested',
  s.events.find((e) => e.type === 'task.completed')?.wasSuggested === true,
)
void pre

console.log('Meaningful work and anti-gaming')
let g = buildSampleState()
const big = scoreCompletion(
  g.tasks.find((t) => t.id === 't-blueprint')!,
  g,
).points
const tiny = scoreCompletion(
  g.tasks.find((t) => t.id === 't-tidy')!,
  g,
).points
check('important work is worth far more than a trivial task', big > tiny * 4, `${big} vs ${tiny}`)
let farmed = 0
for (let i = 0; i < 20; i++) {
  g = reducer(g, { type: 'task/add', id: `farm-${i}`, task: { title: `Tiny ${i}`, plannedFor: today } })
  g = reducer(g, {
    type: 'task/update',
    id: `farm-${i}`,
    patch: { signals: { impact: 1, consequence: 1, userImportance: 'normal' }, effortMinutes: 5 },
  })
  g = reducer(g, { type: 'task/complete', id: `farm-${i}` })
  farmed += g.workEvents.at(-1)!.points
}
check(
  '20 tiny tasks are worth less than ~3 meaningful ones',
  farmed < big * 3,
  `20 tiny = ${farmed}, one real = ${big}`,
)
const lastFarm = g.workEvents.at(-1)!
check('repetition discount applies', lastFarm.breakdown!.repetition < 1, `x${lastFarm.breakdown!.repetition}`)

let inflated = buildSampleState()
const oneHigh = get(reducer(inflated, { type: 'task/importance', id: 't-devenv', level: 'high' }), 't-devenv').why.find(
  (r) => r.key === 'user-high',
)!.weight
for (const t of inflated.tasks.filter((t) => t.status === 'open'))
  inflated = reducer(inflated, { type: 'task/importance', id: t.id, level: 'high' })
const allHigh = get(inflated, 't-devenv').why.find((r) => r.key === 'user-high')!.weight
check(
  'marking everything important weakens each mark',
  allHigh < oneHigh / 2,
  `${oneHigh.toFixed(1)} → ${allHigh.toFixed(1)}`,
)

const effortCap = scoreCompletion({ ...g.tasks.find((t) => t.id === 't-ux')!, effortMinutes: 10000 }, g).breakdown
  .effort
check('inflated effort is capped', effortCap <= 1.45, `x${effortCap}`)

console.log('History is append-only')
{
  let h = buildSampleState()
  const eventsAtStart = h.events.length
  h = reducer(h, { type: 'task/importance', id: 't-ux', level: 'high', source: 'menu' })
  h = reducer(h, { type: 'task/complete', id: 't-ux' })
  const credit = h.workEvents.at(-1)!
  check(
    'completion adds a credit with a snapshot',
    credit.kind === 'credit' && credit.taskTitle === 'Review dashboard UX',
  )
  const pointsBefore = netPoints(h.workEvents)

  h = reducer(h, { type: 'task/reopen', id: 't-ux' })
  check(
    'reopening keeps the original WorkEvent',
    h.workEvents.some((e) => e.id === credit.id && e.points === credit.points),
  )
  const reversal = h.workEvents.at(-1)!
  check(
    'reopening appends a reversal instead',
    reversal.kind === 'reversal' && reversal.reverses === credit.id && reversal.points === -credit.points,
  )
  check('the reversed credit no longer counts', !countedCredits(h.workEvents).some((e) => e.id === credit.id))
  check('net total drops by exactly that credit', netPoints(h.workEvents) === pointsBefore - credit.points)

  h = reducer(h, { type: 'task/complete', id: 't-ux' })
  check(
    'completing again adds a fresh credit',
    countedCredits(h.workEvents).filter((e) => e.taskId === 't-ux').length === 1 &&
      h.workEvents.filter((e) => e.taskId === 't-ux').length === 3,
  )

  const logBeforeDelete = h.workEvents.length
  h = reducer(h, { type: 'task/delete', id: 't-ux' })
  check(
    'deleting a task keeps its WorkEvents',
    h.workEvents.length === logBeforeDelete && h.workEvents.some((e) => e.taskId === 't-ux'),
  )
  check(
    'deleted work still shows in the weekly review',
    selectReview(h, today).moved.some((m) => m.finished.some((f) => f.title === 'Review dashboard UX')),
  )
  const deleted = h.events.find((e) => e.type === 'task.deleted' && e.taskId === 't-ux')
  check('delete event keeps the task title', deleted?.data?.title === 'Review dashboard UX')
  const forTask = h.events.filter((e) => e.taskId === 't-ux').map((e) => e.type)
  check(
    'user corrections stay in the event history',
    h.events.length > eventsAtStart &&
      ['task.importance_changed', 'task.completed', 'task.reopened', 'task.deleted'].every((t) => forTask.includes(t)),
    forTask.join(', '),
  )
}

console.log('Explicit postponement is respected')
{
  const tomorrow = addDays(today, 1)
  let q = buildSampleState()
  q = reducer(q, { type: 'task/plan', id: 't-blueprint', plannedFor: tomorrow, source: 'menu' })
  const bp = q.tasks.find((t) => t.id === 't-blueprint')!
  check('due-today task moved to tomorrow is not "for today"', bp.dueOn === today && !isForToday(bp, today))
  check('…and is not the Home focus', selectHome(q, today).focus?.task.id !== 't-blueprint')
  check('…nor in the Home Today list', !selectHome(q, today).today.some((r) => r.task.id === 't-blueprint'))
  check('…nor what Focus opens', selectFocusTask(q, today)?.id !== 't-blueprint')
  check('…nor anywhere in suggestions', !suggestable(q, today).some((r) => r.task.id === 't-blueprint'))
  check(
    'it comes back on its planned day',
    selectHome(q, tomorrow).focus?.task.id === 't-blueprint',
    `tomorrow's focus: ${selectHome(q, tomorrow).focus?.task.title}`,
  )

  // suggestNext: a newly unblocked task the user planned for later stays put.
  let n = buildSampleState()
  n = reducer(n, { type: 'task/plan', id: 't-model', plannedFor: addDays(today, 3), source: 'menu' })
  n = reducer(n, { type: 'task/plan', id: 't-onboarding', plannedFor: addDays(today, 3), source: 'menu' })
  const bp2 = n.tasks.find((t) => t.id === 't-blueprint')!
  n = reducer(n, { type: 'task/complete', id: 't-blueprint' })
  const nx = suggestNext(n, today, bp2, ['t-model', 't-onboarding'])
  check(
    'suggestNext respects explicit postponement',
    !['t-model', 't-onboarding'].includes(nx?.ranked.task.id ?? ''),
    `suggested: ${nx?.ranked.task.title}`,
  )

  // A due-tomorrow task the user pushed further is not pulled back by suggestNext either.
  let d = buildSampleState()
  d = reducer(d, { type: 'task/plan', id: 't-monad-req', plannedFor: addDays(today, 4), source: 'menu' })
  d = reducer(d, { type: 'task/deadline', id: 't-monad-req', dueOn: tomorrow, source: 'editor' })
  const ux = d.tasks.find((t) => t.id === 't-ux')!
  d = reducer(d, { type: 'task/complete', id: 't-ux' })
  check(
    'suggestNext ignores a near deadline the user planned past',
    suggestNext(d, today, ux, [])?.ranked.task.id !== 't-monad-req',
  )
}

console.log('Cycles')
const c = reducer(buildSampleState(), { type: 'task/depend', id: 't-blueprint', on: 't-model' })
check('a dependency loop is refused', !c.tasks.find((t) => t.id === 't-blueprint')!.dependsOn.includes('t-model'))

console.log(`\nAll ${passed} checks passed.`)
