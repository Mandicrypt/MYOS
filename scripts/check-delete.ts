/**
 * Checks for deleting goals and projects: the item goes, the work stays and loses only its link,
 * and the change reaches the cloud correctly. Run with: npm run check:delete
 */
import { newId } from '../src/lib/id'
import { emptyState } from '../src/store/persistence'
import { reducer, type Action } from '../src/store/reducer'
import { diffStates } from '../src/store/sync/diff'
import type { AppState } from '../src/types'

let passed = 0
function check(name: string, ok: boolean, detail = '') {
  if (!ok) throw new Error(`FAIL: ${name} ${detail}`)
  passed++
  console.log(`  ✓ ${name}`)
}
const run = (s: AppState, ...actions: Action[]) => actions.reduce((acc, a) => reducer(acc, a), s)

const goalId = newId()
const projectId = newId()
const taskInProject = newId()
const taskOnGoal = newId()
const noteId = newId()
const milestoneId = newId()

let base = run(
  emptyState('Test'),
  { type: 'goal/add', id: goalId, title: 'Get fit' },
  { type: 'project/add', id: projectId, title: 'Gym plan' },
  { type: 'project/update', id: projectId, patch: { goalId } },
  { type: 'task/add', id: taskInProject, task: { title: 'Book a gym', projectId, plannedFor: null } },
  { type: 'task/add', id: taskOnGoal, task: { title: 'Run on Sunday', goalId, plannedFor: null } },
  { type: 'note/add', id: noteId, projectId, goalId },
)
base = {
  ...base,
  milestones: [{ id: milestoneId, projectId, title: 'Week 1', status: 'open', dueOn: null } as AppState['milestones'][number]],
  tasks: base.tasks.map((t) => (t.id === taskInProject ? { ...t, milestoneId } : t)),
}

console.log('Deleting a project')
const noProject = reducer(base, { type: 'project/delete', id: projectId })
check('project is gone', !noProject.projects.some((p) => p.id === projectId))
check('its milestones are gone', noProject.milestones.length === 0)
const keptTask = noProject.tasks.find((t) => t.id === taskInProject)
check('its task is kept', keptTask?.title === 'Book a gym')
check('the task loses the project and milestone link', keptTask?.projectId === null && keptTask?.milestoneId === null)
check('the note is kept, unlinked from the project', noProject.notes.find((n) => n.id === noteId)?.projectId === null)
check('the goal is untouched', noProject.goals.some((g) => g.id === goalId))
check('deleting something that is not there changes nothing', reducer(noProject, { type: 'project/delete', id: projectId }) === noProject)

const cloud = diffStates(base, noProject)
check('the cloud is told to delete the project and its milestone', cloud.deletes.projects.includes(projectId) && cloud.deletes.milestones.includes(milestoneId))
check('the cloud is not told to delete any task', cloud.deletes.tasks.length === 0)
check('the unlinked task is saved', cloud.upserts.tasks.some((r) => (r as { id: string }).id === taskInProject))

console.log('Deleting a goal')
const noGoal = reducer(base, { type: 'goal/delete', id: goalId })
check('goal is gone', !noGoal.goals.some((g) => g.id === goalId))
check('its project is kept, unlinked', noGoal.projects.find((p) => p.id === projectId)?.goalId === null)
check('its direct task is kept, unlinked', noGoal.tasks.find((t) => t.id === taskOnGoal)?.goalId === null)
check('the note is kept, unlinked from the goal', noGoal.notes.find((n) => n.id === noteId)?.goalId === null)
check('the project still has its own tasks', noGoal.tasks.find((t) => t.id === taskInProject)?.projectId === projectId)
check('deleting something that is not there changes nothing', reducer(noGoal, { type: 'goal/delete', id: goalId }) === noGoal)

const cloud2 = diffStates(base, noGoal)
check('the cloud is told to delete only the goal', cloud2.deletes.goals.includes(goalId) && cloud2.deletes.projects.length === 0 && cloud2.deletes.tasks.length === 0)

console.log(`\nAll ${passed} checks passed.`)
