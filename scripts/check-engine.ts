/**
 * Plain checks for the decision logic. Run with: npx tsx scripts/check-engine.ts
 * No test framework needed; it throws on the first failure.
 */
import { buildSampleState } from '../src/data/sample'
import { engine } from '../src/engine/importance'
import { scoreCompletion } from '../src/engine/meaningful-work'
import { suggestNext } from '../src/engine/next'
import { isBlocked } from '../src/engine/relations'
import { addDays, todayISO } from '../src/lib/dates'
import { reducer } from '../src/store/reducer'
import { selectHome } from '../src/store/selectors'
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
r = reducer(r, { type: 'task/skip', id: 't-blueprint', plannedFor: addDays(today, 1), source: 'home', wasSuggested: true })
check('"Not today" wins over a deadline', selectHome(r, today).focus?.task.id !== 't-blueprint', `now: ${selectHome(r, today).focus?.task.title}`)
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

console.log('Cycles')
const c = reducer(buildSampleState(), { type: 'task/depend', id: 't-blueprint', on: 't-model' })
check('a dependency loop is refused', !c.tasks.find((t) => t.id === 't-blueprint')!.dependsOn.includes('t-model'))

console.log(`\nAll ${passed} checks passed.`)
