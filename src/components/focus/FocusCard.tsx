import type { RankedTask } from '@/engine/types'
import { Button } from '@/components/ui/Button'
import { projectFor } from '@/store/selectors'
import { useStore } from '@/store/store'

/** The one thing that matters now. The visually dominant element on Home. */
export function FocusCard({ ranked, onStart }: { ranked: RankedTask; onStart: () => void }) {
  const { state } = useStore()
  const { task, reasons } = ranked
  const project = projectFor(state, task)
  const started = task.checklist.some((c) => c.done)
  const doneSteps = task.checklist.filter((c) => c.done).length

  return (
    <section aria-labelledby="focus-title" className="border-y border-line py-10 md:py-12">
      {project ? <p className="text-base text-muted">{project.title}</p> : null}
      <h2 id="focus-title" className="mt-1 text-2xl font-medium tracking-[-0.025em] text-balance">
        {task.title}
      </h2>
      {reasons.length ? <p className="mt-3 text-md text-muted">{reasons.join(' · ')}</p> : null}

      <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
        <Button variant="primary" size="lg" onClick={onStart} className="max-sm:w-full">
          {started ? 'Continue' : 'Start'}
        </Button>
        {task.checklist.length ? (
          <span className="text-base text-muted">
            {doneSteps} of {task.checklist.length} steps done
          </span>
        ) : null}
      </div>
    </section>
  )
}
