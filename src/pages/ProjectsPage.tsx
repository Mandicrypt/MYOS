import { useUi } from '@/app/ui-context'
import { EmptyState } from '@/components/layout/EmptyState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Section } from '@/components/layout/Section'
import { ProjectList } from '@/components/projects/ProjectList'
import { Button } from '@/components/ui/Button'
import { useStore } from '@/store/store'

export function ProjectsPage() {
  const { state } = useStore()
  const { openQuickAdd } = useUi()
  const active = state.projects.filter((p) => p.status === 'active')
  const paused = state.projects.filter((p) => p.status === 'paused')
  const done = state.projects.filter((p) => p.status === 'done')

  return (
    <>
      <PageHeader
        title="Projects"
        intro="What you're actively building."
        action={<Button onClick={() => openQuickAdd('project')}>New project</Button>}
      />
      {active.length ? (
        <Section title="Active">
          <ProjectList projects={active} />
        </Section>
      ) : (
        <EmptyState title="No active projects.">That's a calm place to be.</EmptyState>
      )}
      {paused.length ? (
        <Section title="Paused" className="mt-12">
          <ProjectList projects={paused} />
        </Section>
      ) : null}
      {done.length ? (
        <Section title="Finished" className="mt-12">
          <ProjectList projects={done} />
        </Section>
      ) : null}
    </>
  )
}
