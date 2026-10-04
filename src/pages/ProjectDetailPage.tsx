import { Check, Ellipsis } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { BackLink } from '@/components/layout/BackLink'
import { EmptyState } from '@/components/layout/EmptyState'
import { Section } from '@/components/layout/Section'
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
          {goal || project.status !== 'active' ? (
            <p className="mt-4 text-base text-muted">
              {project.status === 'paused' ? 'Paused' : project.status === 'done' ? 'Finished' : null}
              {project.status !== 'active' && goal ? ' · ' : null}
              {goal ? (
                <>
                  Serves{' '}
                  <Link
                    to="/goals"
                    className="rounded-sm text-ink underline decoration-line underline-offset-4 hover:decoration-[var(--control)]"
                  >
                    {goal.title}
                  </Link>
                </>
              ) : null}
            </p>
          ) : null}
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

        {notes.length ? (
          <Section title="Notes">
            <ul className="divide-y divide-line">
              {notes.map((n) => (
                <li key={n.id}>
                  <Link to={`/notes/${n.id}`} className="block rounded-md py-3 text-base hover:text-accent-ink">
                    {n.title || 'Untitled note'}
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        ) : null}
      </div>
    </>
  )
}
