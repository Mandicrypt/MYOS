import { Check, Ellipsis } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { BackLink } from '@/components/layout/BackLink'
import { EmptyState } from '@/components/layout/EmptyState'
import { Section } from '@/components/layout/Section'
import { LinkedNotes } from '@/components/notes/LinkedNotes'
import { AddTaskInline } from '@/components/tasks/AddTaskInline'
import { TaskList } from '@/components/tasks/TaskList'
import { Menu, MenuContent, MenuItem, MenuTrigger } from '@/components/ui/Menu'
import { useToast } from '@/components/ui/Toast'
import { friendlyDay } from '@/lib/dates'
import { cn } from '@/lib/cn'
import { rankOpen } from '@/store/selectors'
import { useStore } from '@/store/store'

export function ProjectDetailPage() {
  const { projectId } = useParams()
  const { state, today, dispatch, undo } = useStore()
  const toast = useToast()
  const project = state.projects.find((p) => p.id === projectId)

  if (!project) {
    return (
      <>
        <BackLink to="/projects" label="Projects" />
        <EmptyState title="This project isn't here anymore." />
      </>
    )
  }

  const goal = state.goals.find((g) => g.id === project.goalId)
  const open = rankOpen(state, today).filter((r) => r.task.projectId === project.id)
  const milestones = state.milestones.filter((m) => m.projectId === project.id)
  const notes = state.notes.filter((n) => n.projectId === project.id)

  const setStatus = (status: typeof project.status, message: string) => {
    dispatch({ type: 'project/update', id: project.id, patch: { status } })
    toast.show(message, { label: 'Undo', run: undo })
  }

  return (
    <>
      <BackLink to="/projects" label="Projects" />
      <header className="mb-12 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-medium tracking-[-0.02em]">{project.title}</h1>
          {project.summary ? <p className="mt-1.5 text-md text-muted">{project.summary}</p> : null}
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-base text-muted">
            {project.status !== 'active' ? <span>{project.status === 'paused' ? 'Paused' : 'Finished'}</span> : null}
            <label className="flex items-center gap-1.5">
              <span>Goal</span>
              <select
                value={project.goalId ?? ''}
                onChange={(e) =>
                  dispatch({ type: 'project/update', id: project.id, patch: { goalId: e.target.value || null } })
                }
                className="max-w-56 rounded-md bg-transparent py-0.5 text-ink outline-none hover:bg-hover"
              >
                <option value="">None</option>
                {state.goals
                  .filter((g) => g.status === 'active' || g.status === 'paused' || g.id === project.goalId)
                  .map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title}
                    </option>
                  ))}
              </select>
            </label>
            {goal ? (
              <Link to={`/goals/${goal.id}`} className="rounded-sm text-accent-ink underline-offset-4 hover:underline">
                Open goal
              </Link>
            ) : null}
          </div>
        </div>
        <Menu>
          <MenuTrigger
            aria-label="Project actions"
            className="grid size-9 place-items-center rounded-lg text-muted hover:bg-hover hover:text-ink"
          >
            <Ellipsis className="size-4" />
          </MenuTrigger>
          <MenuContent>
            {project.status !== 'active' ? (
              <MenuItem onSelect={() => setStatus('active', 'Project resumed')}>Resume project</MenuItem>
            ) : null}
            {project.status === 'active' ? (
              <MenuItem onSelect={() => setStatus('paused', 'Project paused')}>Pause project</MenuItem>
            ) : null}
            {project.status !== 'done' ? (
              <MenuItem onSelect={() => setStatus('done', 'Project finished')}>Mark as finished</MenuItem>
            ) : null}
          </MenuContent>
        </Menu>
      </header>

      <div className="space-y-12">
        <Section title="Tasks">
          <TaskList items={open} hideProject>
            <li>
              <AddTaskInline defaults={{ projectId: project.id }} />
            </li>
          </TaskList>
        </Section>

        {milestones.length ? (
          <Section title="Milestones">
            <ol className="divide-y divide-line">
              {milestones.map((m) => (
                <li key={m.id} className="flex items-center gap-3.5 py-3">
                  <span
                    aria-hidden
                    className={cn(
                      'grid size-[18px] place-items-center rounded-full border',
                      m.done ? 'border-calm-green bg-calm-green text-on-green' : 'border-[var(--control)]',
                    )}
                  >
                    {m.done ? <Check className="size-3" strokeWidth={3} /> : null}
                  </span>
                  <span className={cn('flex-1 text-base', m.done && 'text-muted')}>{m.title}</span>
                  {m.dueOn && !m.done ? (
                    <span className="text-sm text-muted">{friendlyDay(m.dueOn, today)}</span>
                  ) : null}
                  <span className="sr-only">{m.done ? 'Reached' : 'Not reached yet'}</span>
                </li>
              ))}
            </ol>
          </Section>
        ) : null}

        <LinkedNotes notes={notes} link={{ projectId: project.id }} />
      </div>
    </>
  )
}
