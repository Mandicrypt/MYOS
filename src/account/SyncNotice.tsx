import { useAccount } from './account-context'

/**
 * Appears only when something is wrong with syncing. Calm, small, and the app keeps working.
 */
export function SyncNotice({ className = '' }: { className?: string }) {
  const account = useAccount()
  if (account.mode !== 'account') return null
  const { state } = account.sync
  if (state !== 'offline' && state !== 'error') return null
  return (
    <div role="status" className={`text-sm text-muted ${className}`}>
      <span>{state === 'offline' ? 'You’re offline.' : 'Couldn’t sync.'} Your changes are saved on this device.</span>{' '}
      <button
        type="button"
        onClick={account.syncNow}
        className="rounded-sm text-accent-ink underline-offset-4 hover:underline"
      >
        Try again
      </button>
    </div>
  )
}
