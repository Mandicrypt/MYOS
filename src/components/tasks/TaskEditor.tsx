import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUi } from '@/app/ui-context'
import { Button } from '@/components/ui/Button'
import { Field, Segmented, inputClass } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { addDays } from '@/lib/dates'
import { useStore } from '@/store/store'
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
    dispatch({
      type: 'task/update',
      id: draft.id,
      patch: { ...draft, title: draft.title.trim() || 'Untitled task', plannedFor },
    })
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
