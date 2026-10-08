import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Field, Segmented, inputClass } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { newId } from '@/lib/id'
import { useStore } from '@/store/store'
import type { Goal, GoalCadence, GoalImportance, GoalKind } from '@/types'

/** Create a goal, or edit one. Title, description, importance and target date. */
export function GoalEditor({
  goal,
  open,
  onOpenChange,
}: {
  goal?: Goal
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={goal ? 'Edit goal' : 'New goal'} description="Goal details">
      {open ? <GoalForm goal={goal} onDone={() => onOpenChange(false)} /> : null}
    </Modal>
  )
}

function GoalForm({ goal, onDone }: { goal?: Goal; onDone: () => void }) {
  const { today, dispatch } = useStore()
  const navigate = useNavigate()
  const [title, setTitle] = useState(goal?.title ?? '')
  const [why, setWhy] = useState(goal?.why ?? '')
  const [importance, setImportance] = useState<GoalImportance>(goal?.importance ?? 'normal')
  const [targetDate, setTargetDate] = useState(goal?.targetDate ?? '')
  const [kind, setKind] = useState<GoalKind>(goal?.kind ?? 'finite')
  const [cadence, setCadence] = useState<GoalCadence>(goal?.cadence ?? 'daily')
  const [endsOn, setEndsOn] = useState(goal?.endsOn ?? '')

  const save = () => {
    const clean = title.trim()
    if (!clean) return
    // A finite goal has a target date; an ongoing one has a cadence and, optionally, an end. Never both.
    const fields = {
      title: clean,
      why: why.trim(),
      importance,
      kind,
      targetDate: kind === 'finite' ? targetDate || null : null,
      cadence: kind === 'ongoing' ? cadence : null,
      endsOn: kind === 'ongoing' ? endsOn || null : null,
    }
    if (goal) dispatch({ type: 'goal/update', id: goal.id, patch: fields })
    else {
      const id = newId()
      dispatch({ type: 'goal/add', id, ...fields })
      navigate(`/goals/${id}`)
    }
    onDone()
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault()
        save()
      }}
    >
      <Field label="Goal">
        <input
          className={inputClass}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What are you working toward?"
          autoFocus
        />
      </Field>
      <Field label="Description">
        <textarea
          className={`${inputClass} h-auto min-h-20 py-2.5 leading-relaxed`}
          value={why}
          onChange={(e) => setWhy(e.target.value)}
          placeholder="Why it matters, and what done looks like"
        />
      </Field>
      <div>
        <span className="mb-1.5 block text-sm text-muted">Importance</span>
        <Segmented<GoalImportance>
          label="Importance"
          value={importance}
          onChange={setImportance}
          options={[
            { value: 'low', label: 'Less important' },
            { value: 'normal', label: 'Normal' },
            { value: 'high', label: 'Important' },
          ]}
        />
      </div>
      <div>
        <span className="mb-1.5 block text-sm text-muted">Goal type</span>
        <Segmented<GoalKind>
          label="Goal type"
          value={kind}
          onChange={setKind}
          options={[
            { value: 'finite', label: 'Finite' },
            { value: 'ongoing', label: 'Ongoing' },
          ]}
        />
        <p className="mt-1.5 text-sm text-muted">
          {kind === 'finite'
            ? 'Something you finish, like launching a product.'
            : 'Something you keep up, like posting every day. It never has to end.'}
        </p>
      </div>
      {kind === 'ongoing' ? (
        <>
          <div>
            <span className="mb-1.5 block text-sm text-muted">Cadence</span>
            <Segmented<GoalCadence>
              label="Cadence"
              value={cadence}
              onChange={setCadence}
              options={[
                { value: 'daily', label: 'Daily' },
                { value: 'weekly', label: 'Weekly' },
                { value: 'monthly', label: 'Monthly' },
                { value: 'custom', label: 'Custom' },
              ]}
            />
          </div>
          <Field label="Ends (optional)" className="max-w-xs">
            <input
              type="date"
              className={inputClass}
              value={endsOn}
              min={today}
              onChange={(e) => setEndsOn(e.target.value)}
            />
          </Field>
        </>
      ) : null}
      {kind === 'finite' ? (
        <Field label="Target date" className="max-w-xs">
          <input
            type="date"
            className={inputClass}
            value={targetDate}
            min={goal ? undefined : today}
            onChange={(e) => setTargetDate(e.target.value)}
          />
        </Field>
      ) : null}
      <div className="flex justify-end gap-2 pt-1">
        <Button onClick={onDone}>Cancel</Button>
        <Button type="submit" variant="primary" disabled={!title.trim()}>
          {goal ? 'Save' : 'Create goal'}
        </Button>
      </div>
    </form>
  )
}
