import { Ellipsis } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BackLink } from '@/components/layout/BackLink'
import { EmptyState } from '@/components/layout/EmptyState'
import { Section } from '@/components/layout/Section'
import { GoalEditor } from '@/components/goals/GoalEditor'
import { STATUS_LABEL, targetLabel } from '@/components/goals/goal-labels'
import { LinkedNotes } from '@/components/notes/LinkedNotes'
import { AddTaskInline } from '@/components/tasks/AddTaskInline'
import { TaskList } from '@/components/tasks/TaskList'
import { inputClass } from '@/components/ui/Field'
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from '@/components/ui/Menu'
import { ProgressLine } from '@/components/ui/ProgressLine'
import { useToast } from '@/components/ui/Toast'
import { goalProgress, projectsForGoal, tasksForGoal } from '@/engine/goals'
import { rankOpen } from '@/store/selectors'
import { useStore } from '@/store/store'
import type { GoalStatus } from '@/types'

/** One goal: why it matters, how far along it is, and every piece of work that serves it. */
export function GoalDetailPage() {
  const { goalId } = useParams()
  const { state, today, dispatch, undo } = useStore()
  const toast = useToast()
  const [editing, setEditing] = useState(false)
  const [showDone, setShowDone] = useState(false)
  const goal = state.goals.find((g) => g.id === goalId)

  if (!goal) {
    return (
      <>
        <BackLink to="/goals" label="Goals" />
        <EmptyState title="This goal isn't here anymore." />
      </>
    )
  }

  const progress = goalProgress(state, goal.id)
  const projects = projectsForGoal(state, goal.id)
  const linkable = state.projects.filter((p) => p.goalId !== goal.id && p.status !== 'done')
  const goalTaskIds = new Set(tasksForGoal(state, goal.id).map((t) => t.id))
  const open = rankOpen(state, today).filter((r) => goalTaskIds.has(r.task.id))
  const done = state.tasks.filter((t) => goalTaskIds.has(t.id) && t.status === 'done')
  const notes = state.notes.filter((n) => n.goalId === goal.id)
  const meta = [
    goal.status !== 'active' ? STATUS_LABEL[goal.status] : null,
    goal.importance === 'high' ? 'Important' : goal.importance === 'low' ? 'Less important' : null,
    targetLabel(goal, today),
  ].filter(Boolean)

  const setStatus = (status: GoalStatus, message: string) => {
    dispatch({ type: 'goal/status', id: goal.id, status })
    toast.show(message, { label: 'Undo', run: undo })
  }

  return (
    <>
      <BackLink to="/goals" label="Goals" />
      <header className="mb-10 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-medium tracking-[-0.02em]">{goal.title}</h1>
          {meta.length ? <p className="mt-1.5 text-base text-muted">{meta.join(' · ')}</p> : null}
          {goal.why ? <p className="mt-4 text-md leading-relaxed text-ink/90">{goal.why}</p> : null}
        </div>
        <Menu>
          <MenuTrigger
            aria-label="Goal actions"
            className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-hover hover:text-ink"
          >
            <Ellipsis className="size-4" />
          </MenuTrigger>
          <MenuContent>
            <MenuItem onSelect={() => setEditing(true)}>Edit goal</MenuItem>
            <MenuSeparator />
            {goal.status !== 'completed' ? (
              <MenuItem onSelect={() => setStatus('completed', 'Goal completed')}>Mark as completed</MenuItem>
            ) : null}
            {goal.status === 'active' ? (
              <MenuItem onSelect={() => setStatus('paused', 'Goal paused')}>Pause goal</MenuItem>
            ) : null}
            {goal.status !== 'active' ? (
              <MenuItem onSelect={() => setStatus('active', 'Goal is active again')}>
                {goal.status === 'paused'
                  ? 'Resume goal'
                  : goal.status === 'completed'
                    ? 'Reopen goal'
                    : 'Restore goal'}
              </MenuItem>
            ) : null}
            {goal.status !== 'archived' ? (
              <MenuItem onSelect={() => setStatus('archived', 'Goal archived')}>Archive goal</MenuItem>
            ) : null}
          </MenuContent>
        </Menu>
      </header>

      <section aria-label="Progress" className="mb-12">
        {progress.total ? (
          <>
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-md">{progress.percent}% done</span>
              <span className="text-sm text-muted tabular-nums">
                {progress.done} of {progress.total} linked {progress.total === 1 ? 'task' : 'tasks'}
              </span>
            </div>
            <ProgressLine percent={progress.percent ?? 0} className="mt-2.5" />
          </>
        ) : (
          <p className="text-base text-muted">
            Progress appears once tasks are linked to this goal, directly or through a project.
          </p>
        )}
      </section>

      <div className="space-y-12">
        <Section title="Projects">
          <ul className="divide-y divide-line">
            {projects.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-4 py-3">
                <Link to={`/projects/${p.id}`} className="min-w-0 rounded-sm text-base hover:text-accent-ink">
                  {p.title}
                  {p.status !== 'active' ? (
                    <span className="text-muted"> · {p.status === 'done' ? 'Finished' : 'Paused'}</span>
                  ) : null}
                </Link>
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'project/update', id: p.id, patch: { goalId: null } })}
                  className="shrink-0 rounded-md px-2 py-1 text-sm text-muted hover:bg-hover hover:text-ink"
                  aria-label={`Unlink ${p.title} from this goal`}
                >
                  Unlink
                </button>
              </li>
            ))}
          </ul>
          {linkable.length ? (
            <select
              aria-label="Link a project to this goal"
              value=""
              onChange={(e) =>
                e.target.value && dispatch({ type: 'project/update', id: e.target.value, patch: { goalId: goal.id } })
              }
              className={`${inputClass} mt-2 max-w-xs`}
            >
              <option value="">Link a project…</option>
              {linkable.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          ) : !projects.length ? (
            <p className="py-2 text-base text-muted">No projects yet. Create one with ⌘K, then link it here.</p>
          ) : null}
        </Section>

        <Section title="Tasks">
          <TaskList items={open}>
            <li>
              <AddTaskInline label="Add a task for this goal" defaults={{ goalId: goal.id }} />
            </li>
          </TaskList>
          {done.length ? (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setShowDone((s) => !s)}
                aria-expanded={showDone}
                className="rounded-md text-base text-muted hover:text-ink"
              >
                {showDone ? 'Hide' : 'Show'} {done.length} done
              </button>
              {showDone ? (
                <div className="fade mt-2">
                  <TaskList items={done} />
                </div>
              ) : null}
            </div>
          ) : null}
        </Section>

        <LinkedNotes notes={notes} link={{ goalId: goal.id }} />
      </div>

      <GoalEditor goal={goal} open={editing} onOpenChange={setEditing} />
    </>
  )
}
