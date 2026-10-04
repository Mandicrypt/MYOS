import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUi } from '@/app/ui-context'
import { Button } from '@/components/ui/Button'
import { Field, Segmented, inputClass } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { addDays } from '@/lib/dates'
import { useStore } from '@/store/store'
import { X } from 'lucide-react'
import { wouldCreateCycle } from '@/engine/relations'
import type { Task, UserImportance } from '@/types'

type When = 'today' | 'tomorrow' | 'later' | 'date'

function whenOf(task: Task, today: string): When {
  if (!task.plannedFor) return 'later'
  if (task.plannedFor <= today) return 'today'
  if (task.plannedFor === addDays(today, 1)) return 'tomorrow'
  return 'date'
}

/** Edit a task's details. Opened from any task row. */
export function TaskEditor() {
  const { editingTaskId, editTask } = useUi()
  const { state } = useStore()
  const task = state.tasks.find((t) => t.id === editingTaskId) ?? null
  const close = () => editTask(null)
  return (
    <Modal open={Boolean(task)} onOpenChange={(o) => !o && close()} title="Task details" description="Edit this task">
      {/* Keyed so a different task always starts from its own saved values. */}
      {task ? <TaskEditorForm key={task.id} task={task} onClose={close} /> : null}
    </Modal>
  )
}

function TaskEditorForm({ task, onClose: close }: { task: Task; onClose: () => void }) {
  const { state, today, dispatch } = useStore()
  const navigate = useNavigate()
  const [draft, setDraft] = useState<Task>(task)
  const [when, setWhen] = useState<When>(() => whenOf(task, today))

  const set = <K extends keyof Task>(key: K, value: Task[K]) => setDraft((d) => ({ ...d, [key]: value }))

  const save = () => {
    const plannedFor =
      when === 'today'
        ? today
        : when === 'tomorrow'
          ? addDays(today, 1)
          : when === 'later'
            ? null
            : (draft.plannedFor ?? addDays(today, 2))
    const { dependsOn, ...rest } = draft
    dispatch({
      type: 'task/update',
      id: draft.id,
      source: 'editor',
      patch: { ...rest, title: draft.title.trim() || 'Untitled task', plannedFor },
    })
    // Dependency changes go through their own actions so they are recorded.
    for (const on of dependsOn.filter((d) => !task.dependsOn.includes(d)))
      dispatch({ type: 'task/depend', id: draft.id, on, source: 'editor' })
    for (const on of task.dependsOn.filter((d) => !dependsOn.includes(d)))
      dispatch({ type: 'task/undepend', id: draft.id, on, source: 'editor' })
    close()
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        save()
      }}
      className="space-y-5"
    >
      <Field label="Task">
        <input className={inputClass} value={draft.title} onChange={(e) => set('title', e.target.value)} autoFocus />
      </Field>

      <Field label="Notes">
        <textarea
          className={`${inputClass} h-auto min-h-20 py-2.5 leading-relaxed`}
          value={draft.description ?? ''}
          onChange={(e) => set('description', e.target.value)}
          placeholder="Anything that helps you get it done"
        />
      </Field>

      <div>
        <span className="mb-1.5 block text-sm text-muted">When</span>
        <Segmented<When>
          label="When"
          value={when}
          onChange={setWhen}
          options={[
            { value: 'today', label: 'Today' },
            { value: 'tomorrow', label: 'Tomorrow' },
            { value: 'date', label: 'Pick a day' },
            { value: 'later', label: 'Later' },
          ]}
        />
        {when === 'date' ? (
          <input
            type="date"
            aria-label="Planned day"
            min={today}
            className={`${inputClass} mt-2 w-auto`}
            value={draft.plannedFor ?? addDays(today, 2)}
            onChange={(e) => set('plannedFor', e.target.value || null)}
          />
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Project">
          <select
            className={inputClass}
            value={draft.projectId ?? ''}
            onChange={(e) => set('projectId', e.target.value || null)}
          >
            <option value="">None</option>
            {state.projects
              .filter((p) => p.status !== 'done')
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Deadline">
          <input
            type="date"
            className={inputClass}
            value={draft.dueOn ?? ''}
            onChange={(e) => set('dueOn', e.target.value || null)}
          />
        </Field>
      </div>

      <div>
        <span className="mb-1.5 block text-sm text-muted">Importance</span>
        <Segmented<UserImportance>
          label="Importance"
          value={draft.signals.userImportance}
          onChange={(v) => set('signals', { ...draft.signals, userImportance: v })}
          options={[
            { value: 'low', label: 'Less important' },
            { value: 'normal', label: 'Normal' },
            { value: 'high', label: 'Important' },
          ]}
        />
      </div>

      <Field label="Time needed" className="max-w-xs">
        <select
          className={inputClass}
          value={draft.effortMinutes ?? ''}
          onChange={(e) => set('effortMinutes', e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">Not sure</option>
          <option value="15">A few minutes</option>
          <option value="30">About 30 minutes</option>
          <option value="60">About an hour</option>
          <option value="120">A couple of hours</option>
          <option value="240">Half a day or more</option>
        </select>
      </Field>

      <div>
        <span className="mb-1.5 block text-sm text-muted">Can't start until</span>
        {draft.dependsOn.length ? (
          <ul className="mb-2 space-y-1">
            {draft.dependsOn.map((id) => {
              const dep = state.tasks.find((t) => t.id === id)
              if (!dep) return null
              return (
                <li key={id} className="flex items-center justify-between gap-3 rounded-lg bg-bg px-3 py-2 text-base">
                  <span className={dep.status === 'done' ? 'text-muted line-through' : ''}>{dep.title}</span>
                  <button
                    type="button"
                    aria-label={`Remove “${dep.title}” as a requirement`}
                    onClick={() =>
                      set(
                        'dependsOn',
                        draft.dependsOn.filter((d) => d !== id),
                      )
                    }
                    className="rounded-md p-1 text-muted hover:text-ink"
                  >
                    <X className="size-4" />
                  </button>
                </li>
              )
            })}
          </ul>
        ) : null}
        <select
          className={inputClass}
          value=""
          aria-label="Add a task this one waits for"
          onChange={(e) => e.target.value && set('dependsOn', [...draft.dependsOn, e.target.value])}
        >
          <option value="">{draft.dependsOn.length ? 'Add another task…' : 'Nothing — it can start any time'}</option>
          {state.tasks
            .filter(
              (t) =>
                t.status === 'open' &&
                t.id !== draft.id &&
                !draft.dependsOn.includes(t.id) &&
                !wouldCreateCycle(state, draft.id, t.id),
            )
            .map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
        </select>
      </div>

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
        {draft.status === 'open' ? (
          <Button
            variant="quiet"
            onClick={() => {
              save()
              navigate(`/focus/${draft.id}`)
            }}
          >
            Start focus
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button variant="secondary" onClick={close} className="flex-1 sm:flex-none">
            Cancel
          </Button>
          <Button variant="primary" type="submit" className="flex-1 sm:flex-none">
            Save
          </Button>
        </div>
      </div>
    </form>
  )
}
