import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Section } from '@/components/layout/Section'
import { Button } from '@/components/ui/Button'
import { Field, Segmented, inputClass } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { buildSampleState } from '@/data/sample'
import { useStore } from '@/store/store'
import type { AppState, ThemeChoice } from '@/types'

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

export function SettingsPage() {
  const { state, dispatch } = useStore()
  const toast = useToast()
  const [confirm, setConfirm] = useState<null | 'sample' | 'empty'>(null)

  const replace = (next: AppState, message: string) => {
    dispatch({ type: 'state/replace', state: next })
    setConfirm(null)
    toast.show(message)
  }

  const emptyState = (): AppState => ({
    ...buildSampleState(),
    goals: [],
    projects: [],
    milestones: [],
    tasks: [],
    inbox: [],
    notes: [],
    workEvents: [],
    settings: state.settings,
  })

  return (
    <>
      <PageHeader title="Settings" />

      <div className="space-y-14">
        <Section title="You">
          <Field label="What should MYOS call you?" className="max-w-sm">
            <input
              className={inputClass}
              value={state.settings.name}
              onChange={(e) => dispatch({ type: 'settings/update', patch: { name: e.target.value } })}
              placeholder="Your first name"
            />
          </Field>
        </Section>

        <Section title="Appearance">
          <Segmented<ThemeChoice>
            label="Appearance"
            value={state.settings.theme}
            onChange={(theme) => dispatch({ type: 'settings/update', patch: { theme } })}
            options={[
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
              { value: 'system', label: 'Match device' },
            ]}
          />
        </Section>

        <Section title="Finishing tasks">
          <label className="flex items-start gap-3 text-base">
            <input
              type="checkbox"
              checked={state.settings.showMeaningfulWork}
              onChange={(e) => dispatch({ type: 'settings/update', patch: { showMeaningfulWork: e.target.checked } })}
              className="mt-1 size-4 accent-[var(--primary)]"
            />
            <span>
              Show meaningful work after finishing a task
              <span className="mt-0.5 block text-sm text-muted">
                A small number that reflects how much the task mattered — not how many tasks you did.
              </span>
            </span>
          </label>
        </Section>

        <Section title="Shortcuts">
          <p className="text-base">
            <kbd className="rounded-md border border-line bg-surface px-1.5 py-0.5 font-sans text-sm">
              {isMac ? '⌘ K' : 'Ctrl K'}
            </kbd>
            <span className="ml-3 text-muted">Add a task, idea, note, project or goal</span>
          </p>
        </Section>

        <Section title="Your data">
          <p className="text-base text-muted">
            Everything is saved in this browser only. Accounts and sync come in a later phase.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => setConfirm('sample')}>Restore sample data</Button>
            <Button onClick={() => setConfirm('empty')}>Start with a clean slate</Button>
          </div>
        </Section>
      </div>

      <Modal
        open={confirm !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm === 'empty' ? 'Start with a clean slate?' : 'Restore sample data?'}
        description="Confirm replacing your data"
      >
        <p className="text-base text-muted">
          This replaces everything currently in MYOS on this browser. It can't be undone.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button onClick={() => setConfirm(null)}>Cancel</Button>
          <Button
            variant="primary"
            onClick={() =>
              confirm === 'empty'
                ? replace(emptyState(), 'Clean slate')
                : replace(buildSampleState(), 'Sample data restored')
            }
          >
            {confirm === 'empty' ? 'Clear everything' : 'Restore'}
          </Button>
        </div>
      </Modal>
    </>
  )
}
