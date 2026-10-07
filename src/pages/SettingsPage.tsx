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
import { useAccount } from '@/account/account-context'
import { syncLabel } from '@/account/sync-label'
import { shortAddress } from '@/auth/wallet/errors'

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

export function SettingsPage() {
  const { state, dispatch } = useStore()
  const toast = useToast()
  const [confirm, setConfirm] = useState<null | 'sample' | 'empty'>(null)
  const account = useAccount()
  const [signingOut, setSigningOut] = useState(false)
  const [unsynced, setUnsynced] = useState(false)

  const signOut = async (force = false) => {
    if (account.mode !== 'account') return
    setSigningOut(true)
    const result = await account.signOut({ force })
    setSigningOut(false)
    if (result === 'unsynced') setUnsynced(true)
  }

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

        <Section title="Daily plan">
          <Field label="Focused time on a typical day" className="max-w-xs">
            <select
              className={inputClass}
              value={state.settings.dailyMinutes}
              onChange={(e) => dispatch({ type: 'settings/update', patch: { dailyMinutes: Number(e.target.value) } })}
            >
              {[60, 120, 180, 240, 300, 360, 480].map((m) => (
                <option key={m} value={m}>
                  {m / 60} hour{m === 60 ? '' : 's'}
                </option>
              ))}
            </select>
          </Field>
          <p className="mt-2 text-sm text-muted">Today’s plan fits suggestions into this much time.</p>
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

        {account.mode === 'account' ? (
          <Section title="Account">
            {account.email ? <p className="text-base">{account.email}</p> : null}
            {account.wallet ? (
              <p className="text-base" title={account.wallet}>
                {account.email ? <span className="text-muted">Wallet </span> : 'Signed in with wallet '}
                {shortAddress(account.wallet)}
              </p>
            ) : null}
            <p className="mt-1 text-sm text-muted" role="status">
              {syncLabel(account.sync.state, account.sync.lastSyncedAt)}
            </p>
            <p className="mt-3 text-base text-muted">
              Your data is saved to your account and on this device, so it’s there on every device you sign in to.
            </p>
            <Button className="mt-4" onClick={() => signOut()} disabled={signingOut}>
              {signingOut ? 'Signing out…' : 'Sign out'}
            </Button>
          </Section>
        ) : (
          <Section title="Your data">
            <p className="text-base text-muted">Everything is saved in this browser only.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={() => setConfirm('sample')}>Restore sample data</Button>
              <Button onClick={() => setConfirm('empty')}>Start with a clean slate</Button>
            </div>
          </Section>
        )}
      </div>

      <Modal
        open={unsynced}
        onOpenChange={setUnsynced}
        title="Some changes haven’t synced yet"
        description="Confirm signing out with unsynced changes"
      >
        <p className="text-base text-muted">
          If you sign out now, changes made on this device since the last sync will be lost. Reconnect and try again to
          keep them.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button onClick={() => setUnsynced(false)}>Stay signed in</Button>
          <Button
            variant="primary"
            onClick={() => {
              setUnsynced(false)
              void signOut(true)
            }}
          >
            Sign out anyway
          </Button>
        </div>
      </Modal>

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
